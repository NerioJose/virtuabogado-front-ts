import EstadisticasCards from './EstadisticasCards';
import ContentRenderer from './ContentRenderer';
import { Abogado, SeccionAbogado, Estadisticas } from '@/types/index';

interface AbogadoMainContentProps {
  seccionActiva: SeccionAbogado;
  abogado: Abogado | null;
  estadisticas: Estadisticas;
}

export default function AbogadoMainContent({ seccionActiva, abogado, estadisticas }: AbogadoMainContentProps) {
  return (
    <div className="ml-64 flex-1 p-6">
      {seccionActiva === 'casos' && (
        <EstadisticasCards estadisticas={estadisticas} />
      )}
      
      <div className="bg-white rounded-xl shadow-md p-6">
        <ContentRenderer 
          seccionActiva={seccionActiva}
          abogado={abogado}
        />
      </div>
    </div>
  );
}