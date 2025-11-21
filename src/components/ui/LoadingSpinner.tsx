interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message = "Cargando..." }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-azul-primario border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-azul-primario font-medium">{message}</p>
      </div>
    </div>
  );
}