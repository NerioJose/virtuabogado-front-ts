import crypto from 'crypto';
import { Webhook } from 'svix';

interface ZenobankSessionRequest {
    orderId: string;
    amount: number;
    currency: string;
    description: string;
    customer: {
        email: string;
        name: string;
    };
    redirectUrls: {
        success: string;
        error: string;
    };
}

export class ZenobankService {
    private static apiKey = process.env.ZENOBANK_API_KEY || '';
    private static webhookSecret = process.env.ZENOBANK_WEBHOOK_SECRET || '';
    private static apiUrl = 'https://api.zenobank.io/api/v1/checkouts';

    /**
     * Crea una sesión de checkout en Zenobank v1 (Restauración Total)
     */
    static async createCheckoutSession(request: ZenobankSessionRequest) {
        if (!this.apiKey) {
            console.error('❌ [Zenobank] Missing ZENOBANK_API_KEY');
            throw new Error('Configuración de pago incompleta en el servidor.');
        }

        

        try {
            // Body exacto según documentación oficial de Zenobank API v1
            const body = {
                orderId: String(request.orderId),
                priceAmount: request.amount.toFixed(2), // Requerimiento: String con decimales
                priceCurrency: 'USD',
                successRedirectUrl: request.redirectUrls.success
            };

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = errorText;
                }
                
                console.error('🛑 [Zenobank] Error de API:', {
                    status: response.status,
                    data: errorData
                });

                throw new Error(`Zenobank API Error: ${response.status} - ${typeof errorData === 'object' ? JSON.stringify(errorData) : errorData}`);
            }

            return await response.json();
        } catch (error) {
            console.error('❌ [Zenobank] Error en createCheckoutSession:', error);
            throw error;
        }
    }

    /**
     * Valida la firma HMAC usando la librería oficial SVIX
     * REQUERIMIENTO: svix-id, svix-timestamp, svix-signature
     */
    static verifyWebhookSignature(payload: string, headers: {[key: string]: string}): boolean {
        if (!this.webhookSecret) {
            console.warn('⚠️ [Zenobank] No Webhook Secret configured. Verification skipped (Potencial riesgo).');
            return false;
        }

        try {
            const wh = new Webhook(this.webhookSecret);
            wh.verify(payload, headers);
            return true;
        } catch (err) {
            console.error('❌ [Zenobank] Svix verification failed:', err);
            return false;
        }
    }
}
