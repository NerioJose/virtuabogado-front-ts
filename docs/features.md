# Funcionalidades por Rol - VirtuAbogado

Este documento detalla las capacidades del sistema para cada uno de los tres roles principales: **Administrador**, **Abogado** y **Cliente**.

---

## Administrador (Dashboard Central)

### Gestión de Órdenes
- Vista de todas las órdenes en tiempo real.
- Priorización automática: casos pagados requieren asignación inmediata.
- Asignación manual y re-asignación de casos a abogados.
- Auditoría de chats de cualquier orden.

### Finanzas / Liquidaciones
- Aprobación de pagos a abogados (marcar `PAID`).
- Historial completo de transacciones.
- Configuración de reparto de ingresos (% comisión, impuestos, plataforma).
- Simulador financiero con precios actuales y proyecciones.

### Notificaciones Push
- Control de suscripciones VAPID desde el sidebar.
- Alertas de nuevas órdenes pagadas.
- Gestión de tokens de dispositivos.

---

## Abogado (Gestión de Casos)

### Dashboard
- Casos priorizados por urgencia.
- Lista filtrada de órdenes asignadas.
- Mensajería instantánea con clientes.
- Subida segura de documentos (PDFs, imágenes).

### Facturación (4 Estados)
- **PENDING**: Payout creado, esperando aprobación Admin.
- **PAID**: Payout transferido y confirmado.
- **CANCELLED**: Payout cancelado por Admin.
- **FAILED**: Error en la transferencia.

### Historial de Liquidaciones
- Registro de todos los pagos recibidos.
- Desglose por orden y período.
- Balance pendiente y total histórico.

---

## Cliente (Experiencia de Usuario)

### Checkout
- Catálogo de servicios legales con precios claros.
- Pago seguro via Zenobank (tarjeta, transferencia).
- Auto-login: reconocimiento de usuario existente o creación automática de cuenta.
- Confirmación en tiempo real vía webhook + broadcast.

### Seguimiento de Casos
- Panel "Mis Servicios" con progreso de trámites.
- Chat directo con abogado asignado.
- Descarga de documentos generados por el abogado.
- Notificaciones push de cambios de estado y mensajes nuevos.

---

## Seguridad

- **Middleware**: Protección de rutas `/admin`, `/abogado`, `/mis-servicios`.
- **RLS (Row Level Security)**: Políticas en Supabase para aislamiento de datos por usuario/rol.
- **Firma de Webhooks**: Verificación Svix en endpoints de Zenobank.
- **Rate Limiting**: Middleware protege rutas críticas contra abusos.
