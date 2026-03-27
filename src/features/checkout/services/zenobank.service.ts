import crypto from 'crypto';

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
    private static apiKey = process.env.ZENOBANK_API_KEY || 'zb_test_key_abc123';
    private static webhookSecret = process.env.ZENOBANK_WEBHOOK_SECRET || 'zb_wh_sec_xyz456';
    private static apiUrl = 'https://api.zenobank.io/v1';

    /**
     * Crea una sesión de checkout en Zenobank
     * @param request Datos de la orden
     * @param apiKey Clave de API dinâmica configurada en DB
     */
    static async createCheckoutSession(request: ZenobankSessionRequest, apiKey?: string) {
        const activeKey = apiKey || this.apiKey;
        // En un entorno real, esto sería un fetch a la API de Zenobank usando activeKey
        // Para esta implementación, simulamos el comportamiento esperado según el prompt
        
        console.log('💳 [Zenobank] Creando sesión para orden:', request.orderId);

        // Simulamos la respuesta de la API
        const sessionId = `zb_session_${crypto.randomBytes(8).toString('hex')}`;
        const checkoutUrl = `https://checkout.zenobank.io/pay/${sessionId}`;

        return {
            id: sessionId,
            url: checkoutUrl
        };
    }

    /**
     * Valida la firma HMAC de un webhook de Zenobank
     * @param payload Cuerpo de la petición
     * @param signature Firma enviada en headers
     * @param webhookSecret Secreto dinámico configurado en DB
     */
    static verifyWebhookSignature(payload: string, signature: string, webhookSecret?: string): boolean {
        try {
            const activeSecret = webhookSecret || this.webhookSecret;
            const hmac = crypto.createHmac('sha256', activeSecret);
            const digest = hmac.update(payload).digest('hex');
            return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
        } catch (error) {
            console.error('❌ [Zenobank] Error validando firma:', error);
            return false;
        }
    }
}
