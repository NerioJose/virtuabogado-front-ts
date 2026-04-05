import webpush from 'web-push';
import { prisma } from './prisma';

// Configurar VAPID (Keys deben estar en .env)
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const email = process.env.VAPID_EMAIL || 'mailto:virtuabogado.legal@gmail.com';

if (publicKey && privateKey) {
  console.log('✅ [Push Config] VAPID configurado en el servidor.');
  webpush.setVapidDetails(email, publicKey, privateKey);
} else {
  console.error('🚨 [Push Config] VAPID NO CONFIGURADO CORRECTAMENTE.');
  if (!publicKey) console.error('   ❌ Falta: NEXT_PUBLIC_VAPID_PUBLIC_KEY');
  if (!privateKey) console.error('   ❌ Falta: VAPID_PRIVATE_KEY');
}

interface PushNotificationOptions {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
}

/**
 * Despachador de Notificaciones Push 🚀
 * Envía una alerta de sistema al Admin o Abogado a través de sus suscripciones guardadas.
 */
export async function sendPushNotification(userId: string, options: PushNotificationOptions) {
  // 0. Verificar y Configurar VAPID en cada envío (Resiliencia para Vercel)
  if (!publicKey || !privateKey) {
    const missing = !publicKey ? 'NEXT_PUBLIC_VAPID_PUBLIC_KEY' : 'VAPID_PRIVATE_KEY';
    console.error(`🚨 [Push] Abortando envío. Falta variable de entorno: ${missing}`);
    return { 
      success: false, 
      error: `Configuración incompleta en el servidor: Falta ${missing}` 
    };
  }

  try {
    webpush.setVapidDetails(email, publicKey, privateKey);
    
    // 1. Obtener todas las suscripciones push de este usuario (todos sus dispositivos)
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId }
    });

    if (subscriptions.length === 0) {
      console.info(`ℹ️ [Push Diag] Usuario ${userId} no tiene dispositivos registrados.`);
      return { success: false, sent: 0, error: 'No hay dispositivos registrados para este usuario.' };
    }

    console.log(`📡 [Push Diag] Intentando enviar a ${subscriptions.length} dispositivos para el usuario ${userId}...`);

    const payload = JSON.stringify({
      title: options.title,
      body: options.body,
      url: options.url || '/',
      icon: options.icon || '/logo/logo_sf_1.png',
      tag: (options.tag || 'alert') + '-' + Date.now() // Forzamos unicidad para que el Toast siempre se muestre
    });

    // 2. Enviar a cada dispositivo
    const sendPromises = subscriptions.map((sub) => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      return webpush.sendNotification(pushConfig, payload).catch(async (error: any) => {
        // Si la suscripción ya no es válida (410 Gone o 404), la borramos para mantener la DB limpia
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.warn(`🗑️ [Push] Suscripción expirada para ${userId}, eliminando de DB...`);
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch((err) => console.error(`❌ [Push] Error al eliminar suscripción:`, err));
        } else {
          console.error(`❌ [Push] Error enviando a dispositivo:`, error);
        }
      });
    });

    await Promise.all(sendPromises);
    return { success: true, sent: subscriptions.length };
  } catch (error) {
    console.error('❌ Error catastrófico en el despachador de Push:', error);
    return { success: false, error };
  }
}

/**
 * Notificación Especial: ¡Nueva Venta Confirmada! (Solo para Admin) 💰🔔
 */
export async function notifyNewSale(orderId: string, total: string, needsAssignment: boolean = false) {
  // Buscar a todos los ADMINS
  const admins = await prisma.user.findMany({
    where: { rol: 'ADMIN', activo: true },
    select: { id: true, email: true }
  });

  console.log(`🕵️ [Push Diag] Buscando Admins para notificar venta. Encontrados: ${admins.length} (${admins.map(a => a.email).join(', ')})`);

  const body = needsAssignment 
    ? `💰 ¡Nueva Venta de $${total}! (Orden #${orderId}) - ¡ATENCIÓN: REQUIERE ASIGNAR ABOGADO!`
    : `💰 ¡Nueva Venta de $${total}! (Orden #${orderId}) - La tarea ya ha sido asignada.`;

  const promises = admins.map(admin => 
    sendPushNotification(admin.id, {
      title: needsAssignment ? '🚨 ASIGNACIÓN PENDIENTE ⚖️' : '💰 ¡Nueva Venta en VirtuAbogado!',
      body: body,
      url: '/admin',
      tag: `sale-${orderId}`,
      icon: '/logo/logo_sf_1.png'
    })
  );

  const results = await Promise.all(promises);
  const totalSent = results.reduce((acc, res) => acc + (res.sent || 0), 0);
  
  if (totalSent > 0) {
    console.log(`✅ [Push Success] Venta de Orden #${orderId} notificada exitosamente a ${totalSent} dispositivo(s) de Admins.`);
  } else {
    console.warn(`⚠️ [Push Warn] No se pudo enviar la notificación de venta para #${orderId}. ¿Hay admins con dispositivos registrados?`);
  }
}

/**
 * Notificación Especial: Nuevo Caso Asignado (Solo para Abogado) ⚖️
 */
export async function notifyNewCase(lawyerId: string, orderId: string) {
  await sendPushNotification(lawyerId, {
    title: '⚖️ Nuevo Caso Asignado',
    body: `Se te ha asignado el caso #${orderId}. ¡Entra para ver los detalles y comenzar a trabajar!`,
    url: '/abogado',
    tag: `case-${orderId}`,
    icon: '/logo/logo_sf_1.png'
  });
}
/**
 * Notificación Especial: Nuevo Mensaje de Chat 💬
 * Notifica al destinatario (Cliente o Abogado) sobre un nuevo mensaje.
 */
export async function notifyNewMessage(recipientId: string, senderName: string, content: string, orderId: string) {
  await sendPushNotification(recipientId, {
    title: `💬 Mensaje de ${senderName}`,
    body: content.length > 100 ? `${content.substring(0, 97)}...` : content,
    url: `/detalle-servicio/${orderId}`, // O la ruta correspondiente según el rol
    tag: `chat-${orderId}`,
    icon: '/logo/logo_resized.png'
  });
}
