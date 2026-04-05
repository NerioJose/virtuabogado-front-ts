# Funcionalidades por Rol - VirtuAbogado

Este documento detalla las capacidades del sistema para cada uno de los tres roles principales: **Administrador**, **Abogado** y **Cliente**.

---

## 👨‍💼 Administrador (Dashboard Central)
El administrador tiene control total sobre la plataforma y la salud financiera del negocio.

### Gestión de Órdenes (Casos)
- **Vigilancia 24/7**: Vista de todas las órdenes en tiempo real.
- **Asignación Manual**: Capacidad de re-asignar un caso a un abogado específico si la auto-asignación falló o no es adecuada.
- **Auditoría**: Acceso a los chats de cualquier orden para asegurar la calidad del servicio.

### Configuración Financiera
- **Reparto de Ingresos**: Ajuste de porcentajes de comisión, impuestos y ganancias de plataforma.
- **WhatsApp Global**: Gestión del número de contacto que aparece en toda la web.

### Gestión de Pagos (Payouts)
- **Aprobación de Transferencias**: El Admin marca como `PAID` los pagos a abogados una vez realizados manualmente en el banco.
- **Historial Completo**: Registro de cada centavo que entra y sale.

---

## ⚖️ Abogado (Gestión de Casos)
El abogado se enfoca en resolver los problemas legales de los clientes.

### Dashboard de Trabajo
- **Mis Casos**: Lista filtrada de órdenes asignadas.
- **Mensajería Instantánea**: Chat con el cliente para pedir documentos o aclarar dudas.
- **Subida de Documentos**: Intercambio seguro de archivos (PDFs, imágenes) con el cliente.

### Notificaciones en Tiempo Real
- **Alerta de Nuevo Caso**: Notificación push "Shopify-style" cuando se le asigna un caso pagado.
- **Aviso de Mensajes**: Indicadores visuales y sonoros de mensajes nuevos.

---

## 👤 Cliente (Experiencia de Usuario)
El cliente busca una solución legal rápida, transparente y profesional.

### Proceso de Compra (Checkout)
- **Selección de Servicio**: Catálogo de servicios legales con precios claros.
- **Pago Seguro**: Integración con Zenobank (Tarjeta, Transferencia, etc.).
- **Auto-Login**: Si el cliente ya existe, el sistema lo reconoce; si no, se le crea una cuenta automáticamente tras el pago.

### Seguimiento de Casos
- **Panel "Mis Servicios"**: Vista clara del progreso de sus trámites legales.
- **Chat Directo**: Comunicación constante con su abogado asignado.
- **Descargas**: Acceso a los documentos generados por el abogado en tiempo real.

---

## 🛡️ Seguridad y Accesos
- **Middleware**: Todas las rutas de Abogado y Admin están protegidas. Si un cliente intenta entrar a `/admin`, es redirigido automáticamente.
- **RLS (Row Level Security)**: A nivel de Supabase, solo puedes ver archivos si eres el dueño del caso o el abogado asignado.
