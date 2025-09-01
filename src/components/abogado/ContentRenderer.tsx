import CasosAbogadoPanel from './CasosAbogadoPanel';
import AgendaPanel from './AgendaPanel';
import MensajesPanel from './MensajesPanel';
import ClientesAbogadoPanel from './ClientesAbogadoPanel';
import FacturacionPanel from './FacturacionPanel';
import DocumentosPanel from './DocumentosPanel';
import PerfilAbogadoPanel from './PerfilAbogadoPanel';
import { Abogado, SeccionAbogado } from '@/types';

interface ContentRendererProps {
  seccionActiva: SeccionAbogado;
  abogado: Abogado | null;
}

export default function ContentRenderer({ seccionActiva, abogado }: ContentRendererProps) {
  if (!abogado) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-azul-primario border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-azul-primario font-medium">Cargando datos del abogado...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (seccionActiva) {
      case 'casos':
        return <CasosAbogadoPanel abogadoId={abogado.id} />;
      case 'agenda':
        return <AgendaPanel abogadoId={abogado.id} />;
      case 'mensajes':
        return <MensajesPanel abogadoId={abogado.id} />;
      case 'clientes':
        return <ClientesAbogadoPanel abogadoId={abogado.id} />;
      case 'facturacion':
        return <FacturacionPanel abogadoId={abogado.id} />;
      case 'documentos':
        return <DocumentosPanel abogadoId={abogado.id} />;
      case 'perfil':
        return <PerfilAbogadoPanel abogado={abogado} />;
      default:
        return <CasosAbogadoPanel abogadoId={abogado.id} />;
    }
  };

  return <>{renderContent()}</>;
}