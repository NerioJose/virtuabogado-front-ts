# Atlas de Código — 00 Inventario y Control de Cobertura

Este Atlas documenta **cada archivo de `src/`** para comprensión al 100% y
refactor manual. Este documento es la **lista de control**: ningún archivo se
considera cubierto hasta estar marcado y tener su explicación en el documento
del Atlas correspondiente.

## Reglas de nivel

| Nivel | Significado |
|-------|-------------|
| **L2** | Recorrido **línea a línea**: cada función/bloque, decisiones y edge cases, con `ruta:línea`. |
| **L1** | **Ficha**: propósito, exports, imports, efectos, "qué rompe si cambias". |
| **L3** | **Agrupado**: UI trivial descrita en conjunto. |

## Totales

| Nivel | Archivos |
|-------|---------:|
| L2 | **169** |
| L1 | **131** |
| L3 | **25** |
| **TOTAL** | **325** |

## Documentos del Atlas

| Doc | Cubre |
|-----|-------|
| `01-config.md` | `app/layout.tsx`, `app/robots.ts`, `app/sitemap.ts`, `middleware.ts`, `instrumentation.ts` |
| `02-shared-types.md` | `shared/**`, `types/**` |
| `03-lib.md` | los 26 de `src/lib/**` |
| `04-infra-utils.md` | `utils/**`, `infrastructure/**`, `services/**`, `store/**`, `hooks/**` |
| `05-events.md` | `events/**` |
| `06-features-*.md` | `features/**` |
| `07-app-api.md` | `app/api/**`, `app/auth/callback` |
| `08-app-pages.md` | páginas restantes de `app/**` |
| `09-components.md` | `components/**` |
| `99-cobertura.md` | reporte final 325/325 + índice cruzado |

---

## Checklist de cobertura

> `[x]` = documentado. Sin marcar = pendiente.

### app/
- [x] [L2] `src/app/layout.tsx`
- [ ] [L1] `src/app/page.tsx`
- [x] [L1] `src/app/robots.ts`
- [x] [L1] `src/app/sitemap.ts`

### app/abogado
- [ ] [L1] `src/app/abogado/page.tsx`

### app/admin
- [ ] [L1] `src/app/admin/page.tsx`

### app/api
- [ ] [L2] `src/app/api/auth/check-user/route.ts`
- [ ] [L2] `src/app/api/auth/login/route.ts`
- [ ] [L2] `src/app/api/auth/register/route.ts`
- [ ] [L2] `src/app/api/auth/reset-password/confirm/route.ts`
- [ ] [L2] `src/app/api/auth/reset-password/request/route.ts`
- [ ] [L2] `src/app/api/auth/sync/route.ts`
- [ ] [L2] `src/app/api/auth/validate-email/route.ts`
- [ ] [L2] `src/app/api/clients/[id]/route.ts`
- [ ] [L2] `src/app/api/clients/route.ts`
- [ ] [L2] `src/app/api/display-settings/route.ts`
- [ ] [L2] `src/app/api/documents/route.ts`
- [ ] [L2] `src/app/api/events/cleanup/route.ts`
- [ ] [L2] `src/app/api/events/failed/route.ts`
- [ ] [L2] `src/app/api/events/process/route.ts`
- [ ] [L2] `src/app/api/events/retry/route.ts`
- [ ] [L2] `src/app/api/exchange-rate/route.ts`
- [ ] [L2] `src/app/api/lawyers/[id]/route.ts`
- [ ] [L2] `src/app/api/lawyers/route.ts`
- [ ] [L2] `src/app/api/messages/[orderId]/read/route.ts`
- [ ] [L2] `src/app/api/messages/[orderId]/route.ts`
- [ ] [L2] `src/app/api/messages/unread-counts/route.ts`
- [ ] [L2] `src/app/api/notifications/subscribe/route.ts`
- [ ] [L2] `src/app/api/notifications/telegram/chat/route.ts`
- [ ] [L2] `src/app/api/notifications/telegram/webhook/route.ts`
- [ ] [L2] `src/app/api/notifications/unsubscribe/route.ts`
- [ ] [L2] `src/app/api/orders/[id]/route.ts`
- [ ] [L2] `src/app/api/orders/admin-create/route.ts`
- [ ] [L1] `src/app/api/orders/orders.helpers.ts`
- [ ] [L2] `src/app/api/orders/route.ts`
- [ ] [L2] `src/app/api/payments/mercadopago/route.ts`
- [ ] [L2] `src/app/api/payments/status/route.ts`
- [ ] [L2] `src/app/api/payments/yape/route.ts`
- [ ] [L2] `src/app/api/services/[id]/route.ts`
- [ ] [L2] `src/app/api/services/route.ts`
- [ ] [L2] `src/app/api/settings/financial/route.ts`
- [ ] [L2] `src/app/api/storage/upload/route.ts`
- [ ] [L2] `src/app/api/webhooks/mercadopago/route.ts`
- [ ] [L2] `src/app/api/webhooks/zenobank/route.ts`

### app/auth
- [ ] [L1] `src/app/auth/callback/route.ts`

### app/clientes
- [ ] [L2] `src/app/clientes/layout.tsx`
- [ ] [L1] `src/app/clientes/page.tsx`

### app/compra-exitosa
- [ ] [L1] `src/app/compra-exitosa/page.tsx`

### app/contacto
- [ ] [L2] `src/app/contacto/layout.tsx`
- [ ] [L1] `src/app/contacto/page.tsx`

### app/detalle-servicio
- [ ] [L1] `src/app/detalle-servicio/[id]/page.tsx`

### app/error-pago
- [ ] [L1] `src/app/error-pago/page.tsx`

### app/login
- [ ] [L1] `src/app/login/page.tsx`

### app/mis-servicios
- [ ] [L1] `src/app/mis-servicios/page.tsx`

### app/nosotros
- [ ] [L1] `src/app/nosotros/page.tsx`

### app/payment
- [ ] [L1] `src/app/payment/error/page.tsx`
- [ ] [L1] `src/app/payment/success/page.tsx`

### app/privacidad
- [ ] [L2] `src/app/privacidad/layout.tsx`
- [ ] [L1] `src/app/privacidad/page.tsx`

### app/recuperar-password
- [ ] [L1] `src/app/recuperar-password/page.tsx`

### app/servicios
- [ ] [L2] `src/app/servicios/ServiciosClientPage.tsx`
- [ ] [L1] `src/app/servicios/page.tsx`

### app/terminos
- [ ] [L2] `src/app/terminos/layout.tsx`
- [ ] [L1] `src/app/terminos/page.tsx`

### components/abogado
- [ ] [L1] `src/components/abogado/AbogadoAuthGuard.tsx`
- [ ] [L1] `src/components/abogado/AbogadoLayout.tsx`
- [ ] [L1] `src/components/abogado/AbogadoMainContent.tsx`
- [ ] [L1] `src/components/abogado/AbogadoPanel.tsx`
- [ ] [L1] `src/components/abogado/AbogadoSidebar.tsx`
- [ ] [L1] `src/components/abogado/AgendaPanel.tsx`
- [ ] [L1] `src/components/abogado/CasosAbogadoPanel.tsx`
- [ ] [L1] `src/components/abogado/ClientesAbogadoPanel.tsx`
- [ ] [L1] `src/components/abogado/ContentRenderer.tsx`
- [ ] [L1] `src/components/abogado/DocumentosPanel.tsx`
- [ ] [L1] `src/components/abogado/EstadisticasCards.tsx`
- [ ] [L1] `src/components/abogado/FacturacionPanel.tsx`
- [ ] [L1] `src/components/abogado/MensajesPanel.tsx`
- [ ] [L1] `src/components/abogado/PerfilAbogadoPanel.tsx`
- [ ] [L2] `src/components/abogado/hooks/useAbogadoPanel.ts`
- [ ] [L2] `src/components/abogado/hooks/useAgendaPanel.ts`
- [ ] [L2] `src/components/abogado/hooks/useCasosAbogadoPanel.ts`
- [ ] [L2] `src/components/abogado/hooks/useClientesAbogadoPanel.ts`
- [ ] [L2] `src/components/abogado/hooks/useDocumentosPanel.ts`
- [ ] [L2] `src/components/abogado/hooks/useFacturacionPanel.ts`
- [ ] [L2] `src/components/abogado/hooks/useMensajesPanel.ts`
- [ ] [L2] `src/components/abogado/hooks/usePerfilAbogadoPanel.ts`

### components/admin
- [ ] [L1] `src/components/admin/AdminSupervisionTabs.tsx`
- [ ] [L1] `src/components/admin/CasosPanel.tsx`
- [ ] [L1] `src/components/admin/ConfiguracionPanel.tsx`
- [ ] [L1] `src/components/admin/Dashboard.tsx`
- [ ] [L1] `src/components/admin/DashboardStats.tsx`
- [ ] [L1] `src/components/admin/EstadisticasPanel.tsx`
- [ ] [L1] `src/components/admin/FinanzasPanel.tsx`
- [ ] [L1] `src/components/admin/MetodosPagoPanel.tsx`
- [ ] [L1] `src/components/admin/ModalContainer.tsx`
- [ ] [L1] `src/components/admin/RecentOrders.tsx`
- [ ] [L1] `src/components/admin/ServiciosPanel.tsx`
- [ ] [L1] `src/components/admin/Sidebar.tsx`
- [ ] [L2] `src/components/admin/hooks/useAdminConfiguracion.ts`
- [ ] [L2] `src/components/admin/hooks/useCasosPanel.ts`
- [ ] [L2] `src/components/admin/hooks/useDashboard.ts`
- [ ] [L2] `src/components/admin/hooks/useDashboardStats.ts`
- [ ] [L2] `src/components/admin/hooks/useEstadisticasPanel.ts`
- [ ] [L2] `src/components/admin/hooks/useFinanzasPanel.ts`
- [ ] [L2] `src/components/admin/hooks/useMetodosPagoPanel.ts`
- [ ] [L2] `src/components/admin/hooks/useModalContainer.ts`
- [ ] [L2] `src/components/admin/hooks/useServiciosPanel.ts`

### components/common
- [ ] [L1] `src/components/common/ErrorBoundary.tsx`

### components/contacto
- [ ] [L3] `src/components/contacto/FormularioContacto.tsx`
- [ ] [L3] `src/components/contacto/InformacionContacto.tsx`
- [ ] [L3] `src/components/contacto/SeccionFAQ.tsx`
- [ ] [L3] `src/components/contacto/SeccionMapa.tsx`

### components/homePage
- [ ] [L3] `src/components/homePage/CallToAction.tsx`
- [ ] [L3] `src/components/homePage/HeroSection.tsx`
- [ ] [L3] `src/components/homePage/SeccionTestimonios.tsx`
- [ ] [L3] `src/components/homePage/ServiciosDestacados.jsx`
- [ ] [L3] `src/components/homePage/VirtuStudents.tsx`

### components/layout
- [ ] [L1] `src/components/layout/AbandonedCartReminder.tsx`
- [ ] [L1] `src/components/layout/Footer.tsx`
- [ ] [L1] `src/components/layout/NavBar.tsx`

### components/nosotros
- [ ] [L3] `src/components/nosotros/CTASection.tsx`
- [ ] [L3] `src/components/nosotros/HeroSection.tsx`
- [ ] [L3] `src/components/nosotros/MisionVisionSection.tsx`
- [ ] [L3] `src/components/nosotros/NuestraHistoriaSection.tsx`
- [ ] [L3] `src/components/nosotros/NuestroEquipoSection.tsx`
- [ ] [L3] `src/components/nosotros/ValoresSection.tsx`

### components/notifications
- [ ] [L1] `src/components/notifications/PushNotificationToggle.tsx`
- [ ] [L1] `src/components/notifications/TelegramConnect.tsx`

### components/orders
- [ ] [L1] `src/components/orders/CasiListo.tsx`

### components/providers
- [ ] [L1] `src/components/providers/Providers.tsx`

### components/seo
- [ ] [L1] `src/components/seo/BreadcrumbSchema.tsx`

### components/ui
- [ ] [L3] `src/components/ui/ConfirmModal.tsx`
- [ ] [L3] `src/components/ui/DualPrice.tsx`
- [ ] [L3] `src/components/ui/LoadingSpinner.tsx`
- [ ] [L3] `src/components/ui/PWAInstallBanner.tsx`
- [ ] [L3] `src/components/ui/Pagination.tsx`
- [ ] [L3] `src/components/ui/SecundaryButton.tsx`

### events
- [ ] [L2] `src/events/EventLog.ts`
- [ ] [L2] `src/events/definitions.ts`
- [ ] [L2] `src/events/dispatch.ts`
- [ ] [L2] `src/events/eventBus.ts`
- [ ] [L2] `src/events/handlers/broadcastHandlers.ts`
- [ ] [L2] `src/events/handlers/index.ts`
- [ ] [L2] `src/events/handlers/messageHandlers.ts`
- [ ] [L2] `src/events/handlers/notificationHandlers.ts`
- [ ] [L2] `src/events/handlers/orderHandlers.ts`
- [ ] [L2] `src/events/handlers/serviceHandlers.ts`
- [ ] [L2] `src/events/processor.ts`
- [ ] [L2] `src/events/registry.ts`

### features/auth
- [ ] [L1] `src/features/auth/components/LoginForm.tsx`
- [ ] [L1] `src/features/auth/components/RegisterForm.tsx`
- [ ] [L1] `src/features/auth/components/index.ts`
- [ ] [L2] `src/features/auth/hooks/useAuth.ts`
- [ ] [L2] `src/features/auth/hooks/useAuthGuard.ts`
- [ ] [L2] `src/features/auth/hooks/useLoginForm.ts`
- [ ] [L2] `src/features/auth/hooks/useRegisterForm.ts`
- [ ] [L1] `src/features/auth/index.ts`
- [ ] [L2] `src/features/auth/services/auth.service.ts`
- [ ] [L2] `src/features/auth/store/authStore.ts`
- [ ] [L1] `src/features/auth/types/auth.types.ts`

### features/chat
- [ ] [L1] `src/features/chat/components/ChatWindow.tsx`
- [ ] [L1] `src/features/chat/components/GlobalChatListener.tsx`
- [ ] [L2] `src/features/chat/hooks/useChat.ts`
- [ ] [L2] `src/features/chat/hooks/useChatViewModel.ts`
- [ ] [L2] `src/features/chat/hooks/useGlobalChatListener.ts`
- [ ] [L1] `src/features/chat/index.ts`
- [ ] [L2] `src/features/chat/services/chat.service.ts`
- [ ] [L2] `src/features/chat/store/chatStore.ts`
- [ ] [L1] `src/features/chat/types/chat.types.ts`
- [ ] [L1] `src/features/chat/utils/chatHelpers.tsx`

### features/checkout
- [ ] [L1] `src/features/checkout/CheckoutLayoutWrapper.tsx`
- [ ] [L1] `src/features/checkout/DynamicCheckoutWrapper.tsx`
- [ ] [L2] `src/features/checkout/actions/checkUserAction.ts`
- [ ] [L2] `src/features/checkout/actions/paymentMethods.ts`
- [ ] [L2] `src/features/checkout/actions/processPaymentAction.ts`
- [ ] [L1] `src/features/checkout/components/AutoLoginIndicator.tsx`
- [ ] [L1] `src/features/checkout/components/CartRecovery.tsx`
- [ ] [L1] `src/features/checkout/components/CheckoutModal.tsx`
- [ ] [L1] `src/features/checkout/components/CheckoutStateSync.tsx`
- [ ] [L1] `src/features/checkout/components/ConfirmationStep.tsx`
- [ ] [L1] `src/features/checkout/components/ErrorMessage.tsx`
- [ ] [L1] `src/features/checkout/components/LoadingOverlay.tsx`
- [ ] [L1] `src/features/checkout/components/MercadoPagoCardStep.tsx`
- [ ] [L1] `src/features/checkout/components/PaymentSelectorModal.tsx`
- [ ] [L1] `src/features/checkout/components/PaymentStep.tsx`
- [ ] [L1] `src/features/checkout/components/ServiceSummary.tsx`
- [ ] [L1] `src/features/checkout/components/StepIndicator.tsx`
- [ ] [L1] `src/features/checkout/components/UserDataStep.tsx`
- [ ] [L1] `src/features/checkout/components/YapeStep.tsx`
- [ ] [L2] `src/features/checkout/hooks/useCheckout.ts`
- [ ] [L2] `src/features/checkout/hooks/useCheckoutStorage.ts`
- [ ] [L2] `src/features/checkout/hooks/useConfirmationStep.ts`
- [ ] [L2] `src/features/checkout/hooks/useMercadoPago.ts`
- [ ] [L2] `src/features/checkout/hooks/useOrderStatus.ts`
- [ ] [L2] `src/features/checkout/hooks/usePaymentMethods.ts`
- [ ] [L2] `src/features/checkout/hooks/usePaymentStep.ts`
- [ ] [L2] `src/features/checkout/hooks/useUserDataStep.ts`
- [ ] [L1] `src/features/checkout/index.ts`
- [ ] [L2] `src/features/checkout/services/checkout.service.ts`
- [ ] [L2] `src/features/checkout/services/mercadopago.service.ts`
- [ ] [L2] `src/features/checkout/services/mercadopago.types.ts`
- [ ] [L2] `src/features/checkout/services/zenobank.service.ts`
- [ ] [L2] `src/features/checkout/store/checkoutStore.ts`
- [ ] [L1] `src/features/checkout/types/checkout.types.ts`
- [ ] [L1] `src/features/checkout/utils/checkoutCleanup.ts`

### features/clients
- [ ] [L1] `src/features/clients/components/ClientPanel.tsx`
- [ ] [L1] `src/features/clients/components/ClientSidebar.tsx`
- [ ] [L1] `src/features/clients/components/ClientStats.tsx`
- [ ] [L1] `src/features/clients/components/ClientesPanel.tsx`
- [ ] [L2] `src/features/clients/hooks/useClientPanel.ts`
- [ ] [L2] `src/features/clients/hooks/useClientSidebar.ts`
- [ ] [L2] `src/features/clients/hooks/useClientesPanel.ts`
- [ ] [L2] `src/features/clients/hooks/useClients.ts`
- [ ] [L1] `src/features/clients/index.ts`
- [ ] [L2] `src/features/clients/services/clients.service.ts`
- [ ] [L2] `src/features/clients/store/clientsStore.ts`
- [ ] [L1] `src/features/clients/types/clients.types.ts`

### features/documents
- [ ] [L1] `src/features/documents/components/DocumentList.tsx`
- [ ] [L2] `src/features/documents/hooks/useDocumentListViewModel.tsx`
- [ ] [L1] `src/features/documents/index.ts`
- [ ] [L2] `src/features/documents/services/documents.service.ts`
- [ ] [L1] `src/features/documents/types/documents.types.ts`

### features/finance
- [ ] [L2] `src/features/finance/actions/getFinancialSummary.ts`
- [ ] [L2] `src/features/finance/actions/paymentActions.ts`
- [ ] [L2] `src/features/finance/actions/payoutActions.ts`
- [ ] [L1] `src/features/finance/components/PayoutHistoryList.tsx`
- [ ] [L1] `src/features/finance/components/PayoutManagement.tsx`
- [ ] [L2] `src/features/finance/hooks/useDisplaySettings.ts`
- [ ] [L2] `src/features/finance/hooks/useExchangeRate.ts`
- [ ] [L2] `src/features/finance/hooks/usePayoutManagement.ts`

### features/financial-settings
- [ ] [L2] `src/features/financial-settings/hooks/useConfiguracionPanel.ts`
- [ ] [L2] `src/features/financial-settings/hooks/useFinancialSettings.ts`
- [ ] [L2] `src/features/financial-settings/services/financial-settings.service.ts`
- [ ] [L1] `src/features/financial-settings/types/financial-settings.types.ts`

### features/lawyers
- [ ] [L1] `src/features/lawyers/components/AbogadosPanel.tsx`
- [ ] [L2] `src/features/lawyers/hooks/useAbogadosPanel.ts`
- [ ] [L2] `src/features/lawyers/hooks/useLawyers.ts`
- [ ] [L1] `src/features/lawyers/index.ts`
- [ ] [L2] `src/features/lawyers/services/lawyers.service.ts`
- [ ] [L2] `src/features/lawyers/store/lawyersStore.ts`
- [ ] [L1] `src/features/lawyers/types/lawyers.types.ts`

### features/orders
- [ ] [L2] `src/features/orders/actions/getOrdersHistory.ts`
- [ ] [L1] `src/features/orders/components/OrdersHistoryTable.tsx`
- [ ] [L2] `src/features/orders/hooks/useOrders.ts`
- [ ] [L2] `src/features/orders/hooks/useOrdersHistory.ts`
- [ ] [L2] `src/features/orders/hooks/useOrdersHistoryTable.ts`
- [ ] [L1] `src/features/orders/index.ts`
- [ ] [L2] `src/features/orders/services/orders.service.ts`
- [ ] [L2] `src/features/orders/store/ordersStore.ts`
- [ ] [L1] `src/features/orders/types/orders.types.ts`
- [ ] [L1] `src/features/orders/utils/orderMappers.ts`

### features/services
- [ ] [L2] `src/features/services/hooks/useMisServicios.ts`
- [ ] [L2] `src/features/services/hooks/useServices.ts`
- [ ] [L2] `src/features/services/hooks/useServicesRealtime.ts`
- [ ] [L2] `src/features/services/hooks/useServiciosClientPage.ts`
- [ ] [L2] `src/features/services/mappers/serviceJson.ts`
- [ ] [L2] `src/features/services/services/services.service.ts`
- [ ] [L2] `src/features/services/store/servicesStore.ts`
- [ ] [L2] `src/features/services/types/services.types.ts`

### features/storage
- [ ] [L1] `src/features/storage/components/UploadManager.tsx`
- [ ] [L2] `src/features/storage/hooks/useResumableUpload.ts`
- [ ] [L2] `src/features/storage/hooks/useUploadManagerViewModel.ts`
- [ ] [L1] `src/features/storage/index.ts`
- [ ] [L2] `src/features/storage/store/uploadStore.ts`

### hooks
- [ ] [L1] `src/hooks/useAbogadoData.ts`
- [ ] [L1] `src/hooks/useApi.ts`
- [ ] [L1] `src/hooks/useAuth.ts`
- [ ] [L1] `src/hooks/useDisplaySettingsRealtime.ts`
- [ ] [L1] `src/hooks/useLocalStorage.ts`
- [ ] [L1] `src/hooks/usePWAInstall.ts`
- [ ] [L1] `src/hooks/usePushNotifications.ts`
- [ ] [L1] `src/hooks/useRealtimeSubscription.ts`

### infrastructure
- [ ] [L1] `src/infrastructure/api/client.ts`
- [ ] [L1] `src/infrastructure/storage/localStorage.adapter.ts`

### instrumentation.ts
- [x] [L2] `src/instrumentation.ts`

### lib
- [ ] [L2] `src/lib/api.ts`
- [ ] [L2] `src/lib/apiClient.ts`
- [ ] [L2] `src/lib/auth.ts`
- [ ] [L2] `src/lib/broadcast.ts`
- [ ] [L2] `src/lib/cache.ts`
- [ ] [L2] `src/lib/constants.ts`
- [ ] [L2] `src/lib/cronAuth.ts`
- [ ] [L2] `src/lib/emailDeliverability.ts`
- [ ] [L2] `src/lib/emailTemplates.ts`
- [ ] [L2] `src/lib/emailValidation.ts`
- [ ] [L2] `src/lib/exchangeRate.ts`
- [ ] [L2] `src/lib/finance.ts`
- [ ] [L2] `src/lib/formatOrderId.ts`
- [ ] [L2] `src/lib/getFinancialSettings.ts`
- [ ] [L2] `src/lib/money.ts`
- [ ] [L2] `src/lib/nodemailer.ts`
- [ ] [L2] `src/lib/prisma.ts`
- [ ] [L2] `src/lib/push-notifications.ts`
- [ ] [L2] `src/lib/queryClient.ts`
- [ ] [L2] `src/lib/resend.ts`
- [ ] [L2] `src/lib/servicePrice.ts`
- [ ] [L2] `src/lib/systemUser.ts`
- [ ] [L2] `src/lib/telegram.ts`
- [ ] [L2] `src/lib/turnstile.ts`
- [ ] [L2] `src/lib/utils/analytics.ts`
- [ ] [L2] `src/lib/utils/cartRecovery.ts`

### middleware.ts
- [x] [L2] `src/middleware.ts`

### services
- [ ] [L1] `src/services/chat.service.ts`
- [ ] [L1] `src/services/finance.service.ts`
- [ ] [L1] `src/services/identity.service.ts`

### shared/components
- [x] [L1] `src/shared/components/TurnstileWidget.tsx`
- [x] [L1] `src/shared/components/feedback/Loader.tsx`
- [x] [L3] `src/shared/components/ui/Button/Button.tsx`
- [x] [L3] `src/shared/components/ui/Card/Card.tsx`
- [x] [L3] `src/shared/components/ui/Input/Input.tsx`
- [x] [L3] `src/shared/components/ui/index.ts`

### shared/constants
- [x] [L1] `src/shared/constants/routes.ts`

### shared/types
- [x] [L1] `src/shared/types/common.types.ts`
- [x] [L1] `src/shared/types/entities.types.ts`

### shared/utils
- [x] [L1] `src/shared/utils/cn.ts`

### store
- [ ] [L1] `src/store/userStore.ts`

### types
- [x] [L1] `src/types/api.ts` (vacío)
- [x] [L1] `src/types/auth.ts` (vacío)
- [x] [L1] `src/types/index.ts`

### utils/
- [ ] [L1] `src/utils/formatters.ts`
- [ ] [L1] `src/utils/imageCompression.ts`

### utils/supabase
- [ ] [L2] `src/utils/supabase/admin.ts`
- [ ] [L2] `src/utils/supabase/client.ts`
- [ ] [L2] `src/utils/supabase/middleware.ts`
- [ ] [L2] `src/utils/supabase/server.ts`

---

**Progreso Fase 1**: 15/325 documentados (config + shared/types).
**Siguiente**: `01-config.md` y `02-shared-types.md` (Fase 1), luego `03-lib.md`.
