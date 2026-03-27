/**
 * Panel de Estadísticas - Conectado a stores reales
 * Muestra gráficos y métricas calculadas desde Zustand
 */

import { useMemo, memo } from 'react';
import { FiBarChart2, FiTrendingUp, FiDownload, FiFilter, FiPieChart } from 'react-icons/fi';
import { useOrders } from '@/features/orders/hooks/useOrders';
// import { useOrdersStore } from '@/features/orders';
import { OrderStatus } from '@/features/orders/types/orders.types';
import { useClients } from '@/features/clients/hooks/useClients';
import { useLawyers } from '@/features/lawyers/hooks/useLawyers';
import { useState } from 'react';

function EstadisticasPanel() {
  const [periodo, setPeriodo] = useState<'mes' | 'trimestre' | 'año'>('mes');

  // ============ STORES GLOBALES & HOOKS ============
  const { data: orders = [] } = useOrders();
  const { data: clients = [] } = useClients();
  const { data: lawyers = [] } = useLawyers();

  // Calcular estadísticas reales
  const estadisticas = useMemo(() => {
    if (orders.length === 0) {
      return {
        totalOrdenes: 0,
        totalClientes: clients.length,
        totalAbogados: lawyers.length,
        ingresosTotales: 0,
        promedioOrden: 0,
      };
    }

    const ingresosTotales = orders.reduce((sum, order) => sum + order.total, 0);
    const promedioOrden = ingresosTotales / orders.length;

    return {
      totalOrdenes: orders.length,
      totalClientes: clients.length,
      totalAbogados: lawyers.length,
      ingresosTotales,
      promedioOrden,
    };
  }, [orders, clients.length, lawyers.length]);

  return (
    <div className="space-y-6">
      {/* Controles superiores */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center">
          <FiFilter className="text-gray-500 mr-2" />
          <span className="text-gray-700 font-medium mr-3">Período:</span>
          <div className="flex gap-2">
            {(['mes', 'trimestre', 'año'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-3 py-1 rounded-full text-sm ${periodo === p
                  ? 'bg-azul-primario text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {p === 'mes' ? 'Último mes' :
                  p === 'trimestre' ? 'Último trimestre' : 'Último año'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
            <FiDownload className="text-gray-500" />
            <span>PDF</span>
          </button>
          <button className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
            <FiDownload className="text-gray-500" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Órdenes</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {estadisticas.totalOrdenes}
              </p>
            </div>
            <FiBarChart2 className="text-azul-primario text-3xl" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Clientes</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {estadisticas.totalClientes}
              </p>
            </div>
            <FiPieChart className="text-green-600 text-3xl" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Abogados</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {estadisticas.totalAbogados}
              </p>
            </div>
            <FiBarChart2 className="text-blue-600 text-3xl" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ingresos Totales</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                ${estadisticas.ingresosTotales.toLocaleString()}
              </p>
            </div>
            <FiTrendingUp className="text-green-600 text-3xl" />
          </div>
        </div>
      </div>

      {/* Mensaje informativo si no hay datos */}
      {orders.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <FiBarChart2 className="text-blue-600 text-5xl mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay datos estadísticos aún
          </h3>
          <p className="text-gray-600">
            Las estadísticas se mostrarán cuando haya órdenes registradas en el sistema.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Los clientes se registran automáticamente al comprar servicios.
          </p>
        </div>
      )}

      {/* Resumen adicional */}
      {orders.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Resumen de Actividad
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Promedio por orden</span>
                <span className="text-lg font-medium text-gray-900">
                  ${estadisticas.promedioOrden.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Órdenes completadas</span>
                <span className="text-lg font-medium text-green-600">
                  {orders.filter(o => o.status === OrderStatus.COMPLETADO).length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Órdenes pendientes</span>
                <span className="text-lg font-medium text-yellow-600">
                  {orders.filter(o => o.status === OrderStatus.PENDIENTE).length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Estado del Sistema
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Capacidad de atención</span>
                  <span className="text-sm font-medium text-gray-900">
                    {estadisticas.totalAbogados > 0
                      ? `${((estadisticas.totalOrdenes / (estadisticas.totalAbogados * 10)) * 100).toFixed(0)}%`
                      : '0%'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-azul-primario h-2 rounded-full"
                    style={{
                      width: estadisticas.totalAbogados > 0
                        ? `${Math.min(((estadisticas.totalOrdenes / (estadisticas.totalAbogados * 10)) * 100), 100)}%`
                        : '0%'
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Crecimiento clientes</span>
                  <span className="text-sm font-medium text-green-600">
                    +{estadisticas.totalClientes}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${Math.min((estadisticas.totalClientes / 100) * 100, 100)}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(EstadisticasPanel);