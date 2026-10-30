import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: [
      "src/lib/api.ts",
      "src/lib/apiClient.ts",
      "src/lib/socket.ts",
      "src/lib/turnstile-client.ts",
      "src/features/auth/services/auth.service.ts",
      "src/features/auth/store/authStore.ts",
      "src/features/auth/hooks/useRegisterForm.ts",
      "src/features/auth/components/LoginForm.tsx",
      "src/features/auth/components/RegisterForm.tsx",
      "src/features/auth/types/auth.types.ts",
      "src/features/checkout/hooks/useUserDataStep.ts",
      "src/features/checkout/services/checkout.service.ts",
      "src/features/checkout/store/checkoutStore.ts",
      "src/hooks/useRealtimeSubscription.ts",
      "src/features/finance/hooks/useExchangeRate.ts",
      "src/features/finance/hooks/useDisplaySettings.ts",
      "src/features/services/hooks/useServicesRealtime.ts",
      "src/hooks/useDisplaySettingsRealtime.ts",
      "src/shared/components/TurnstileWidget.tsx",
      "src/app/recuperar-password/page.tsx",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
];

export default eslintConfig;
