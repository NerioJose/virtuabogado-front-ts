import { useState, useEffect } from 'react';
import { FiBarChart2, FiTrendingUp, FiDownload, FiFilter, FiPieChart } from 'react-icons/fi';

export default function EstadisticasPanel() {
  const [periodo, setPeriodo] = useState<'mes' | 'trimestre' | 'año'>('mes');
  const [loading, setLoading] = useState(true);
  const [estadisticas, setEstadisticas] = useState({
    casosNuevos: [0, 0, 0, 0],
    casosCompletados: [0, 0, 0, 0],
    ingresos: [0, 0, 0, 0],
    distribucionCasos: {
      'Derecho Civil': 0,
      'Derecho Penal': 0,
      'Derecho Mercantil': 0,
      'Derecho Laboral': 0,
      'Derecho Fiscal': 0,
      'Derecho de Familia': 0,
      'Otros': 0
    },
    satisfaccionClientes: 0,
    tiempoRespuesta: 0
  });

  useEffect(() => {
    // Simulación de carga de datos
    setLoading(true);
    setTimeout(() => {
      // Datos de ejemplo según el periodo seleccionado
      if (periodo === 'mes') {
        setEstadisticas({
          casosNuevos: [12, 15, 10, 18],
          casosCompletados: [8, 12, 9, 14],
          ingresos: [1200, 1500, 1100, 1800],
          distribucionCasos: {
            'Derecho Civil': 25,
            'Derecho Penal': 10,
            'Derecho Mercantil': 15,
            'Derecho Laboral': 20,
            'Derecho Fiscal': 10,
            'Derecho de Familia': 15,
            'Otros': 5
          },
          satisfaccionClientes: 4.7,
          tiempoRespuesta: 6
        });
      } else if (periodo === 'trimestre') {
        setEstadisticas({
          casosNuevos: [45, 52, 48, 55],
          casosCompletados: [38, 42, 40, 48],
          ingresos: [4500, 5200, 4800, 5500],
          distribucionCasos: {
            'Derecho Civil': 22,
            'Derecho Penal': 12,
            'Derecho Mercantil': 18,
            'Derecho Laboral': 18,
            'Derecho Fiscal': 12,
            'Derecho de Familia': 13,
            'Otros': 5
          },
          satisfaccionClientes: 4.5,
          tiempoRespuesta: 8
        });
      } else {
        setEstadisticas({
          casosNuevos: [180, 210, 195, 225],
          casosCompletados: [160, 185, 170, 200],
          ingresos: [18000, 21000, 19500, 22500],
          distribucionCasos: {
            'Derecho Civil': 20,
            'Derecho Penal': 15,
            'Derecho Mercantil': 15,
            'Derecho Laboral': 15,
            'Derecho Fiscal': 15,
            'Derecho de Familia': 15,
            'Otros': 5
          },
          satisfaccionClientes: 4.6,
          tiempoRespuesta: 7
        });
      }
      setLoading(false);
    }, 1000);
  }, [periodo]);

  // Función para exportar informes (simulada)
  const exportarInforme = (formato: 'pdf' | 'excel') => {
    alert(`Exportando informe en formato ${formato}...`);
    // Aquí iría la lógica real de exportación
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controles superiores */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center">
          <FiFilter className="text-gray-500 mr-2" />
          <span className="text-gray-700 font-medium mr-3">Periodo:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPeriodo('mes')}
              className={`px-3 py-1 rounded-full text-sm ${
                periodo === 'mes' 
                  ? 'bg-azul-primario text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Último mes
            </button>
            <button
              onClick={() => setPeriodo('trimestre')}
              className={`px-3 py-1 rounded-full text-sm ${
                periodo === 'trimestre' 
                  ? 'bg-azul-primario text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Último trimestre
            </button>
            <button
              onClick={() => setPeriodo('año')}
              className={`px-3 py-1 rounded-full text-sm ${
                periodo === 'año' 
                  ? 'bg-azul-primario text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Último año
            </button>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => exportarInforme('pdf')}
            className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            <FiDownload className="text-gray-500" />
            <span>PDF</span>
          </button>
          <button
            onClick={() => exportarInforme('excel')}
            className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            <FiDownload className="text-gray-500" />
            <span>Excel</span>
          </button>
        </div>
      </div>
      
      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de casos */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Evolución de casos</h3>
            <FiBarChart2 className="text-azul-primario text-xl" />
          </div>
          
          <div className="h-64 flex items-end justify-between gap-2 mt-4 border-b border-l border-gray-200 relative">
            {/* Simulación de gráfico de barras */}
            {estadisticas.casosNuevos.map((valor, index) => (
              <div key={`nuevos-${index}`} className="flex flex-col items-center w-1/8">
                <div className="flex flex-col items-center w-full">
                  <div 
                    className="w-8 bg-azul-primario rounded-t-sm" 
                    style={{ height: `${(valor / Math.max(...estadisticas.casosNuevos)) * 150}px` }}
                  ></div>
                  <div 
                    className="w-8 bg-green-500 rounded-t-sm mt-1" 
                    style={{ height: `${(estadisticas.casosCompletados[index] / Math.max(...estadisticas.casosNuevos)) * 150}px` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 mt-2">Semana {index + 1}</span>
              </div>
            ))}
            
            {/* Leyenda */}
            <div className="absolute top-0 right-0 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-azul-primario"></div>
                <span className="text-xs text-gray-500">Nuevos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500"></div>
                <span className="text-xs text-gray-500">Completados</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Gráfico de ingresos */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Ingresos</h3>
            <FiTrendingUp className="text-green-500 text-xl" />
          </div>
          
          <div className="h-64 flex items-end justify-between gap-2 mt-4 border-b border-l border-gray-200">
            {/* Simulación de gráfico de línea */}
            <div className="relative w-full h-full">
              {estadisticas.ingresos.map((valor, index) => (
                <div 
                  key={`ingreso-${index}`}
                  className="absolute w-3 h-3 bg-green-500 rounded-full"
                  style={{ 
                    bottom: `${(valor / Math.max(...estadisticas.ingresos)) * 80}%`,
                    left: `${(index / (estadisticas.ingresos.length - 1)) * 90}%`
                  }}
                ></div>
              ))}
              
              {/* Línea que conecta los puntos (simplificada) */}
              <div className="absolute bottom-0 left-0 w-full h-full">
                <svg className="w-full h-full">
                  <polyline
                    points={estadisticas.ingresos.map((valor, index) => 
                      `${(index / (estadisticas.ingresos.length - 1)) * 90}% ${100 - (valor / Math.max(...estadisticas.ingresos)) * 80}%`
                    ).join(' ')}
                    fill="none"
                    stroke="rgb(34, 197, 94)"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              
              {/* Etiquetas del eje X */}
              {estadisticas.ingresos.map((_, index) => (
                <div 
                  key={`label-${index}`}
                  className="absolute text-xs text-gray-500"
                  style={{ 
                    bottom: '-20px',
                    left: `${(index / (estadisticas.ingresos.length - 1)) * 90}%`,
                    transform: 'translateX(-50%)'
                  }}
                >
                  Semana {index + 1}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Estadísticas adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Distribución por tipo de caso */}
        <div className="bg-white rounded-lg shadow-sm p-6 md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Distribución por tipo de caso</h3>
            <FiPieChart className="text-azul-primario text-xl" />
          </div>
          
          <div className="space-y-3 mt-4">
            {Object.entries(estadisticas.distribucionCasos).map(([tipo, porcentaje]) => (
              <div key={tipo}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">{tipo}</span>
                  <span className="text-sm font-medium text-gray-900">{porcentaje}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-azul-primario h-2 rounded-full" 
                    style={{ width: `${porcentaje}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* KPIs */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Indicadores clave</h3>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Satisfacción de clientes</span>
                <span className="text-sm font-medium text-gray-900">{estadisticas.satisfaccionClientes}/5</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${(estadisticas.satisfaccionClientes / 5) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Tiempo medio de respuesta</span>
                <span className="text-sm font-medium text-gray-900">{estadisticas.tiempoRespuesta} horas</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-amber-500 h-2 rounded-full" 
                  style={{ width: `${(1 - (estadisticas.tiempoRespuesta / 24)) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tasa de conversión</span>
                <span className="text-sm font-medium text-green-600">+12.5%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">vs. periodo anterior</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}