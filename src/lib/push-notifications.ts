import webpush from 'web-push';
import { prisma } from './prisma';

// Configurar VAPID (Keys deben estar en .env)
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const email = process.env.VAPID_EMAIL;

if (publicKey && privateKey && email) {
  
  webpush.setVapidDetails(email, publicKey, privateKey);
} else {
  console.error('🚨 [Push Config] VAPID NO CONFIGURADO CORRECTAMENTE.');
  if (!publicKey) console.error('   ❌ Falta: NEXT_PUBLIC_VAPID_PUBLIC_KEY');
  if (!privateKey) console.error('   ❌ Falta: VAPID_PRIVATE_KEY');
  if (!email) console.error('   ❌ Falta: VAPID_EMAIL');
}

interface PushNotificationOptions {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
}

/**
 * Despachador de Notificaciones Push 🚀 (Battle-Hardened v3.0)
 * 
 * - Envía a TODOS los dispositivos registrados del usuario (multidispositivo)
 * - urgency: 'high' fuerza entrega inmediata en Google/Mozilla incluso en modo ahorro de batería
 * - TTL: 86400 (24h) — el servidor de push reintentará si el dispositivo está offline
 * - Auto-limpieza de suscripciones expiradas (410/404)
 */
export async function sendPushNotification(userId: string, options: PushNotificationOptions) {
  if (!publicKey || !privateKey) {
    const missing = !publicKey ? 'NEXT_PUBLIC_VAPID_PUBLIC_KEY' : 'VAPID_PRIVATE_KEY';
    console.error(`🚨 [Push] Abortando envío. Falta variable de entorno: ${missing}`);
    return {
      success: false,
      error: `Configuración incompleta en el servidor: Falta ${missing}`,
    };
  }

  try {
    webpush.setVapidDetails(email, publicKey, privateKey);

    // 1. Obtener todas las suscripciones push del usuario (todos sus dispositivos)
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      console.info(`ℹ️ [Push] Usuario ${userId} no tiene dispositivos registrados.`);
      return { success: false, sent: 0, error: 'No hay dispositivos registrados.' };
    }

    

    const payload = JSON.stringify({
      title: options.title,
      body: options.body,
      url: options.url || '/',
      icon: options.icon || '/logo/logo_sf_1.png',
      // Tag único para que cada notificación sea independiente y no colapse otras
      tag: (options.tag || 'alert') + '-' + Date.now(),
    });

    // Opciones de entrega: prioridad máxima, reintento de 24h
    const webPushOptions = {
      urgency: 'high' as const,  // Fuerza entrega inmediata (bypasa modo ahorro de energía)
      TTL: 86400,                  // Reintenta durante 24 horas si el dispositivo está offline
    };

    // 2. Disparar a todos los dispositivos en paralelo
    const sendPromises = subscriptions.map((sub) => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      return webpush
        .sendNotification(pushConfig, payload, webPushOptions)
        .then(() => {
          
        })
        .catch(async (error: any) => {
          // Suscripción expirada (navegador desinstalado, permisos revocados) → limpiar DB
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.warn(`🗑️ [Push] Suscripción expirada (${error.statusCode}). Eliminando...`);
            await prisma.pushSubscription
              .delete({ where: { id: sub.id } })
              .catch((err) => console.error('❌ [Push] Error al eliminar suscripción:', err));
          } else {
            console.error(`❌ [Push] Error enviando a ${sub.endpoint.slice(-20)}:`, error.message);
          }
        });
    });

    await Promise.all(sendPromises);
    return { success: true, sent: subscriptions.length };
  } catch (error) {
    console.error('❌ [Push] Error catastrófico en el despachador:', error);
    return { success: false, error };
  }
}

// ─────────────────────────────────────────────────────────────────
// NOTIFICACIONES ESPECÍFICAS POR EVENTO
// ─────────────────────────────────────────────────────────────────

/**
 * 💰 Nueva Venta Confirmada (solo para Admins)
 * Payload enriquecido: nombre del cliente y servicio contratado
 */
export async function notifyNewSale(
  orderId: string,
  total: string,
  needsAssignment: boolean = false,
  clientName?: string,
  serviceName?: string
) {
  // Buscar solo admins activos
  const admins = await prisma.user.findMany({
    where: { rol: 'ADMIN' as any, activo: true },
    select: { id: true, email: true },
  });

  

  const clientDisplay = clientName || 'un cliente';
  const serviceDisplay = serviceName || 'servicios legales';

  const title = needsAssignment
    ? '🚨 Pago Confirmado — Asignación Pendiente'
    : '💰 Pago Confirmado';

  const body = `Se ha recibido un pago de ${clientDisplay} por ${serviceDisplay} ($${total})${needsAssignment ? ' — ¡REQUIERE ASIGNAR ABOGADO!' : ''}`;

  const promises = admins.map((admin) =>
    sendPushNotification(admin.id, {
      title,
      body,
      // URL específica: panel de admin con el pago en foco
      url: `/admin?orden=${orderId}`,
      tag: `sale-${orderId}`,
      icon: '/logo/logo_sf_1.png',
    })
  );

  const results = await Promise.all(promises);
  const totalSent = results.reduce((acc, res) => acc + (res.sent || 0), 0);

  if (totalSent > 0) {
    
  } else {
    console.warn(`⚠️ [Push] Nadie recibió la notificación de venta para #${orderId}.`);
  }

  return { success: totalSent > 0, sent: totalSent };
}

/**
 * ⚖️ Nuevo Caso Asignado (solo para el Abogado específico)
 * URL específica: `/abogado?caso=ORDERID` para que el panel auto-seleccione el caso
 */
export async function notifyNewCase(lawyerId: string, orderId: string, serviceName?: string) {
  const serviceDisplay = serviceName || `Expediente #${orderId.slice(0, 8)}`;

  return await sendPushNotification(lawyerId, {
    title: '⚖️ Nuevo Caso Asignado',
    body: `Tienes un nuevo expediente asignado: ${serviceDisplay}. Entra para ver los detalles.`,
    // Opción B: URL específica para auto-abrir el caso en el panel del abogado
    url: `/abogado?caso=${orderId}`,
    tag: `case-${orderId}`,
    icon: '/logo/logo_sf_1.png',
  });
}

/**
 * 💬 Nuevo Mensaje de Chat
 * URL diferenciada según el rol del destinatario
 */
export async function notifyNewMessage(
  recipientId: string,
  senderName: string,
  content: string,
  orderId: string
) {
  // Determinar rol del destinatario para construir la URL correcta
  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { rol: true },
  });

  // RESTRICCIÓN: Los clientes NO reciben push por chat (solo por asignación/completado)
  // para evitar saturación de procesos en el servidor.
  if (recipient?.rol === 'CLIENTE') {
    
    return { success: true, message: 'Push omitido por rol' };
  }

  // URL específica según rol: abogado va a su panel con el caso seleccionado
  const url =
    recipient?.rol === 'ABOGADO'
      ? `/abogado?caso=${orderId}`
      : recipient?.rol === 'ADMIN'
        ? `/admin?orden=${orderId}`
        : `/detalle-servicio/${orderId}`;

  return await sendPushNotification(recipientId, {
    title: `💬 Mensaje de ${senderName}`,
    body: content.length > 100 ? `${content.substring(0, 97)}...` : content,
    url,
    tag: `chat-${orderId}`,
    icon: '/logo/logo_resized.png',
  });
}

/**
 * ✅ Caso Completado (para Admins)
 */
export async function notifyCaseCompleted(orderId: string, lawyerName?: string, serviceName?: string, amount?: string) {
    const admins = await prisma.user.findMany({
        where: { rol: 'ADMIN', activo: true },
        select: { id: true },
    });
    const lawyerDisplay = lawyerName || 'El abogado';
    const serviceDisplay = serviceName || 'un caso';
    const amountDisplay = amount ? ` ($${amount})` : '';
    const promises = admins.map((admin) =>
        sendPushNotification(admin.id, {
            title: '✅ Caso Completado',
            body: `${lawyerDisplay} ha completado ${serviceDisplay}${amountDisplay}. Revisa las liquidaciones pendientes.`,
            url: `/admin?orden=${orderId}`,
            tag: `completed-${orderId}`,
            icon: '/logo/logo_sf_1.png',
        })
    );
    const results = await Promise.allSettled(promises);
    const sent = results.filter(r => r.status === 'fulfilled').length;
    return { success: sent > 0, sent };
}

/**
 * 💸 Liquidación de Honorarios Procesada
 */
export async function notifyPayoutCompleted(lawyerId: string, payoutId: string, amount: string) {
  return await sendPushNotification(lawyerId, {
    title: '💸 Honorarios Transferidos',
    body: `¡Buenas noticias! Tu liquidación #${payoutId.slice(0, 8)} por ${amount} ha sido procesada. Revisa tu cuenta bancaria.`,
    url: '/abogado?seccion=facturacion',
    tag: `payout-${payoutId}`,
    icon: '/logo/logo_sf_1.png',
  });
}

/**
 * 📈 Actualización de Estado de Orden (Para Clientes)
 * Notifica eventos críticos como "Abogado Asignado" o "Caso Completado"
 */
export async function notifyOrderStatusUpdate(
  userId: string,
  orderId: string,
  status: string,
  serviceName?: string
) {
  const serviceDisplay = serviceName || `Expediente #${orderId.slice(0, 8)}`;
  
  let title = '📈 Actualización de Caso';
  let body = `Tu caso ${serviceDisplay} ha cambiado al estado: ${status}.`;
  let url = `/detalle-servicio/${orderId}`;

  if (status === 'EN_PROGRESO') {
    title = '⚖️ Abogado Asignado';
    body = `¡Buenas noticias! Un abogado experto ha sido asignado a tu caso: ${serviceDisplay}. Ya puedes iniciar el chat.`;
  } else if (status === 'COMPLETADO') {
    title = '✅ Caso Finalizado';
    body = `Tu abogado ha marcado el caso ${serviceDisplay} como completado. ¡Revisa los resultados finales!`;
  }

  return await sendPushNotification(userId, {
    title,
    body,
    url,
    tag: `status-${orderId}`,
    icon: '/logo/logo_sf_1.png',
  });
}
