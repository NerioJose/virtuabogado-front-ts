import crypto from 'crypto';

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

interface MercadoPagoPaymentResult {
    id: number;
    status: string;
    status_detail: string;
    transaction_amount: number;
    currency_id: string;
    external_reference: string;
    installments?: number;
    payer?: {
        id?: string;
        email?: string;
        type?: string;
        identification?: {
            type?: string;
            number?: string;
        };
    };
    transaction_details?: {
        net_received_amount?: number;
        total_paid_amount?: number;
    };
    fee_details?: Array<{
        type?: string;
        amount?: string;
        fee_payer?: string;
    }>;
}

const MP_API_BASE = 'https://api.mercadopago.com';

/**
 * Servicio de integración con MercadoPago (Checkout Bricks / Card Payment).
 *
 * IMPORTANTE — Seguridad:
 *  - El monto (transaction_amount) SIEMPRE se calcula server-side a partir del
 *    order.total (USD) convertido a PEN con el tipo de cambio del día.
 *    Nunca se debe confiar en un monto enviado por el cliente.
 */
export class MercadoPagoService {
    private static accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
    private static webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET || '';

    private static async request<T>(path: string, init?: RequestInit): Promise<T> {
        if (!this.accessToken) {
            console.error('❌ [MercadoPago] Missing MERCADOPAGO_ACCESS_TOKEN');
            throw new Error('Configuración de pago incompleta en el servidor.');
        }

        const extraHeaders: Record<string, string> = {};
        if (init?.headers) {
            const h = init.headers as Record<string, string>;
            if (h['X-Idempotency-Key']) {
                extraHeaders['X-Idempotency-Key'] = h['X-Idempotency-Key'];
            }
        }

        const res = await fetch(`${MP_API_BASE}${path}`, {
            ...init,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.accessToken}`,
                ...extraHeaders,
                ...(init?.headers as Record<string, string>),
            },
            cache: 'no-store',
        });

        const text = await res.text();
        let body: any;
        try {
            body = text ? JSON.parse(text) : null;
        } catch {
            body = text;
        }

        if (!res.ok) {
            console.error('🛑 [MercadoPago] Error de API:', {
                status: res.status,
                path,
                error: typeof body === 'object' ? body : text,
            });
            throw new Error(
                `MercadoPago API Error: ${res.status} - ${
                    typeof body === 'object' ? JSON.stringify(body) : text
                }`
            );
        }

        return body as T;
    }

    /**
     * Crea un pago con el payment_token generado por el Card Payment Brick.
     */
    static async createPayment(request: MercadoPagoCreatePaymentRequest): Promise<MercadoPagoPaymentResult> {
        // Payer enriquecido: nombre (first/last) y teléfono si están disponibles.
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

        // payment_method_id/payment_type_id SOLO si el SDK entrega valores reales
        // (ej. 'visa', 'master'). Nunca 'card': MP lo rechaza con "Invalid parameters
        // for payment_method API". Si no vienen, MP infiere el método desde el token.
        if (request.paymentMethodId && request.paymentMethodId !== 'card') {
            body.payment_method_id = request.paymentMethodId;
        }
        if (request.paymentTypeId) {
            body.payment_type_id = request.paymentTypeId;
        }
        if (request.issuerId) {
            body.issuer_id = request.issuerId;
        }

        const headers: Record<string, string> = { 'X-Idempotency-Key': `${request.orderId}-${request.paymentToken}` };
        // Device ID (X-meli-session-id) para mejorar la evaluación antifraude.
        if (request.deviceId) {
            headers['X-meli-session-id'] = request.deviceId;
        }

        const result = await this.request<MercadoPagoPaymentResult>('/v1/payments', {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });

        return result;
    }

    /**
     * Consulta el detalle de un pago por su ID.
     */
    static async getPayment(paymentId: string): Promise<MercadoPagoPaymentResult> {
        return this.request<MercadoPagoPaymentResult>(`/v1/payments/${paymentId}`);
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