import crypto from 'crypto';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import type { PaymentResponse } from 'mercadopago/dist/clients/payment/commonTypes';

/**
 * Método de pago aceptado por el servicio.
 */
type PaymentMethod = 'card' | 'yape';

interface MercadoPagoCreatePaymentRequest {
    orderId: string;
    amountPen: number;
    paymentToken: string;
    paymentMethodId?: string;
    paymentTypeId?: string;
    issuerId?: string;
    description: string;
    payerEmail: string;
    // Datos enriquecidos (mejoran aprobación/seguridad según calidad de MP)
    payerFirstName?: string;
    payerLastName?: string;
    payerPhone?: string;
    itemTitle?: string;
    itemDescription?: string;
    deviceId?: string;
    bin?: string;
}

/**
 * Servicio de integración con MercadoPago usando la SDK oficial de Node
 * (`mercadopago` v3). Aplica tanto a tarjeta (Card Payment Brick) como a
 * Yape (Checkout API — celular + OTP → token Yape).
 *
 * IMPORTANTE — Seguridad:
 *  - El monto (transaction_amount) SIEMPRE se calcula server-side a partir del
 *    order.total (USD) convertido a PEN con el tipo de cambio del día.
 *    Nunca se debe confiar en un monto enviado por el cliente.
 *  - Los datos de tarjeta jamás tocan el servidor: el Brick los captura en
 *    secure fields y solo se envía el payment_token (PCI SAQ-A).
 */
export class MercadoPagoService {
    private static accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
    private static webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET || '';

    private static payment: Payment | null = null;

    /**
     * Cliente de la SDK inicializado una sola vez con el access token.
     */
    private static getPaymentClient(): Payment {
        if (!this.accessToken) {
            console.error('❌ [MercadoPago] Missing MERCADOPAGO_ACCESS_TOKEN');
            throw new Error('Configuración de pago incompleta en el servidor.');
        }
        if (!this.payment) {
            const config = new MercadoPagoConfig({
                accessToken: this.accessToken,
                options: {
                    timeout: 15000,
                    // Identificador de integrador certificado (mejora calidad/seguridad).
                    integratorId: process.env.MERCADOPAGO_INTEGRATOR_ID || undefined,
                },
            });
            this.payment = new Payment(config);
        }
        return this.payment;
    }

    /**
     * Construye el body de creación de pago compartido por tarjeta y Yape,
     * marcando la diferencia por el método elegido.
     */
    private static buildPaymentBody(
        request: MercadoPagoCreatePaymentRequest,
        method: PaymentMethod
    ): Record<string, unknown> {
        const payer: Record<string, unknown> = {
            email: request.payerEmail,
        };
        if (request.payerFirstName) payer.first_name = request.payerFirstName;
        if (request.payerLastName) payer.last_name = request.payerLastName;
        if (request.payerPhone) {
            payer.phone = { number: request.payerPhone };
        }

        const body: Record<string, unknown> = {
            transaction_amount: request.amountPen,
            token: request.paymentToken,
            description: request.description,
            installments: 1,
            payer,
            external_reference: request.orderId,
            statement_descriptor: 'VirtuAbogado',
            notification_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/webhooks/mercadopago`,
        };

        if (method === 'yape') {
            body.payment_method_id = 'yape';
        } else {
            // payment_method_id/payment_type_id SOLO si el SDK entrega valores reales
            // (ej. 'visa', 'master'). Nunca 'card': MP lo rechaza. Si no vienen,
            // MP infiere el método desde el token.
            if (request.paymentMethodId && request.paymentMethodId !== 'card') {
                body.payment_method_id = request.paymentMethodId;
            }
            if (request.paymentTypeId) {
                body.payment_type_id = request.paymentTypeId;
            }
            if (request.issuerId) {
                body.issuer_id = request.issuerId;
            }
        }

        // Datos del ítem (additional_info) para mejorar la aprobación de pagos.
        if (request.itemTitle) {
            body.additional_info = {
                items: [
                    {
                        id: request.orderId,
                        title: request.itemTitle,
                        ...(request.itemDescription ? { description: request.itemDescription } : {}),
                        quantity: 1,
                        unit_price: request.amountPen,
                    },
                ],
            };
        }

        return body;
    }

    /**
     * Crea un pago (tarjeta o Yape) usando la SDK oficial de MercadoPago.
     *
     * El Device ID (`MP_DEVICE_SESSION_ID` generado con security.js para
     * antifraude) se envía de forma nativa a través de `options.meliSessionId`,
     * que la SDK serializa como header `X-Meli-Session-Id`.
     */
    private static async create(request: MercadoPagoCreatePaymentRequest, method: PaymentMethod): Promise<PaymentResponse> {
        const body = this.buildPaymentBody(request, method);
        const requestOptions: Record<string, unknown> = {
            idempotencyKey: `${request.orderId}-${request.paymentToken}`,
        };
        if (request.deviceId) {
            requestOptions.meliSessionId = request.deviceId;
        }

        try {
            const result = await this.getPaymentClient().create({
                body,
                requestOptions,
            });
            return result;
        } catch (error: any) {
            // La SDK lanza errores tipados; aquí expone el detalle de la API
            // (p. ej. 1004 invalid parameters). Registramos y re-lanzamos.
            const apiError = error?.cause ?? error;
            console.error('🛑 [MercadoPago] Error creando pago (SDK):', {
                method,
                status: apiError?.status,
                message: apiError?.message,
                cause: apiError?.cause ?? apiError,
            });
            throw new Error(
                (apiError?.message as string) ||
                'Error al procesar el pago con MercadoPago.'
            );
        }
    }

    /**
     * Crea un pago con tarjeta (Card Payment Brick → payment token).
     */
    static async createPayment(request: MercadoPagoCreatePaymentRequest): Promise<PaymentResponse> {
        return this.create(request, 'card');
    }

    /**
     * Crea un pago con Yape (Checkout API — celular + OTP → token Yape).
     *
     * El token Yape es de un solo uso por compra y se genera en el cliente con
     * `mp.yape.create({ otp, phoneNumber })`. Aquí se crea el pago con
     * `payment_method_id: "yape"`. El monto se cobra en PEN (cálculo server-side).
     */
    static async createYapePayment(request: MercadoPagoCreatePaymentRequest): Promise<PaymentResponse> {
        return this.create(request, 'yape');
    }

    /**
     * Consulta el detalle de un pago por su ID.
     */
    static async getPayment(paymentId: string): Promise<PaymentResponse> {
        try {
            return await this.getPaymentClient().get({ id: paymentId });
        } catch (error: any) {
            const apiError = error?.cause ?? error;
            console.error('🛑 [MercadoPago] Error consultando pago (SDK):', {
                paymentId,
                status: apiError?.status,
                message: apiError?.message,
            });
            throw new Error(
                (apiError?.message as string) ||
                'Error al consultar el pago con MercadoPago.'
            );
        }
    }

    /**
     * Valida la firma del webhook de MercadoPago.
     *
     * Algoritmo oficial:
     *   - Header `x-signature` → `ts=<ts>,v1=<hash>`
     *   - Manifest: `id:<data.id>.creation_date:<ts>:`
     *   - hash = HMAC-SHA256(secret, manifest)
     */
    static verifyWebhookSignature(
        query: Record<string, string>,
        headers: { 'x-signature'?: string; 'x-request-id'?: string }
    ): boolean {
        const signature = headers['x-signature'];
        const dataId = query['data.id'];

        if (!signature || !dataId) {
            console.warn('⚠️ [MercadoPago] Missing x-signature or data.id.');
            return false;
        }
        if (!this.webhookSecret) {
            console.warn('⚠️ [MercadoPago] No Webhook Secret configured.');
            return false;
        }

        try {
            const parts = new Map<string, string>();
            for (const pair of signature.split(',')) {
                const [k, ...rest] = pair.split('=');
                parts.set(k, rest.join('='));
            }

            const ts = parts.get('ts');
            const sign = parts.get('v1');

            if (!ts || !sign) {
                console.warn('⚠️ [MercadoPago] x-signature sin ts/v1.');
                return false;
            }

            const manifest = `id:${dataId}.creation_date:${ts}:`;
            const expected = crypto
                .createHmac('sha256', this.webhookSecret)
                .update(manifest)
                .digest('hex');

            return expected === sign;
        } catch (err) {
            console.error('❌ [MercadoPago] Signature verification failed:', err);
            return false;
        }
    }
}
