import { useState, useEffect } from 'react';
import { FiUsers, FiUserCheck, FiBriefcase, FiDollarSign, FiAlertCircle, FiCheckCircle, FiClock } from 'react-icons/fi';

export default function DashboardStats() {
  const [stats, setStats] = useState({
    totalAbogados: 0,
    abogadosPendientes: 0,
    totalClientes: 0,
    casosActivos: 0,
    casosPendientes: 0,
    casosCompletados: 0,
    ingresosMes: 0,
    ingresosTotales: 0,
    gananciasNetas: 0
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Aquí se haría la llamada a la API para obtener las estadísticas
    // Por ahora usamos datos de ejemplo
    setTimeout(() => {
      setStats({
        totalAbogados: 24,
        abogadosPendientes: 5,
        totalClientes: 87,
        casosActivos: 42,
        casosPendientes: 15,
        casosCompletados: 63,
        ingresosMes: 8750,
        ingresosTotales: 124500,
        gananciasNetas: 78300
      });
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-800">Resumen General</h2>
      
      {/* Tarjetas de estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total de Abogados</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalAbogados}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <FiUserCheck className="text-2xl text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <FiAlertCircle className="text-amber-500 mr-1" />
            <span className="text-amber-500">{stats.abogadosPendientes} pendientes de aprobación</span>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total de Clientes</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalClientes}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <FiUsers className="text-2xl text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <FiCheckCircle className="text-green-500 mr-1" />
            <span className="text-green-500">+12 nuevos este mes</span>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Casos Activos</p>
              <p className="text-3xl font-bold text-gray-800">{stats.casosActivos}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <FiBriefcase className="text-2xl text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <FiClock className="text-amber-500 mr-1" />
            <span className="text-amber-500">{stats.casosPendientes} pendientes de asignación</span>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Ingresos del Mes</p>
              <p className="text-3xl font-bold text-gray-800">${stats.ingresosMes.toLocaleString()}</p>
            </div>
            <div className="bg-teal-100 p-3 rounded-full">
              <FiDollarSign className="text-2xl text-teal-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <FiCheckCircle className="text-green-500 mr-1" />
            <span className="text-green-500">+18% vs. mes anterior</span>
          </div>
        </div>
      </div>
      
      {/* Gráficos y estadísticas adicionales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumen de Casos</h3>
          <div className="flex justify-between items-center">
            <div className="text-center">
              <p className="text-2xl font-bold text-azul-primario">{stats.casosActivos}</p>
              <p className="text-sm text-gray-500">Activos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-500">{stats.casosPendientes}</p>
              <p className="text-sm text-gray-500">Pendientes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">{stats.casosCompletados}</p>
              <p className="text-sm text-gray-500">Completados</p>
            </div>
          </div>
          <div className="mt-6 h-4 bg-gray-200 rounded-full overflow-hidden">
            <div className="flex h-full">
              <div 
                className="bg-azul-primario h-full" 
                style={{ width: `${(stats.casosActivos / (stats.casosActivos + stats.casosPendientes + stats.casosCompletados)) * 100}%` }}
              ></div>
              <div 
                className="bg-amber-500 h-full" 
                style={{ width: `${(stats.casosPendientes / (stats.casosActivos + stats.casosPendientes + stats.casosCompletados)) * 100}%` }}
              ></div>
              <div 
                className="bg-green-500 h-full" 
                style={{ width: `${(stats.casosCompletados / (stats.casosActivos + stats.casosPendientes + stats.casosCompletados)) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumen Financiero</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-gray-600">Ingresos Totales</p>
              <p className="font-semibold">${stats.ingresosTotales.toLocaleString()}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-gray-600">Pagos a Abogados</p>
              <p className="font-semibold">${(stats.ingresosTotales - stats.gananciasNetas).toLocaleString()}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-gray-600">Gastos Operativos</p>
              <p className="font-semibold">$12,500</p>
            </div>
            <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
              <p className="font-semibold text-gray-800">Ganancias Netas</p>
              <p className="font-bold text-green-600">${stats.gananciasNetas.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Actividad reciente */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Actividad Reciente</h3>
        <div className="space-y-4">
          {[
            { tipo: 'caso', accion: 'Nuevo caso registrado', detalles: 'Consulta legal sobre derecho laboral', tiempo: '10 minutos' },
            { tipo: 'abogado', accion: 'Solicitud de registro', detalles: 'María Rodríguez - Especialista en Derecho Mercantil', tiempo: '1 hora' },
            { tipo: 'pago', accion: 'Pago recibido', detalles: 'Consulta legal #1234 - $150', tiempo: '2 horas' },
            { tipo: 'caso', accion: 'Caso completado', detalles: 'Revisión de contrato #5678', tiempo: '3 horas' },
            { tipo: 'abogado', accion: 'Abogado aprobado', detalles: 'Carlos Méndez - Especialista en Derecho Civil', tiempo: '5 horas' }
          ].map((actividad, index) => (
            <div key={index} className="flex items-start">
              <div className={`p-2 rounded-full mr-4 ${
                actividad.tipo === 'caso' ? 'bg-purple-100' : 
                actividad.tipo === 'abogado' ? 'bg-blue-100' : 'bg-green-100'
              }`}>
                {actividad.tipo === 'caso' && <FiBriefcase className={`text-purple-600`} />}
                {actividad.tipo === 'abogado' && <FiUserCheck className={`text-blue-600`} />}
                {actividad.tipo === 'pago' && <FiDollarSign className={`text-green-600`} />}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800">{actividad.accion}</p>
                <p className="text-gray-600 text-sm">{actividad.detalles}</p>
              </div>
              <p className="text-gray-400 text-sm">Hace {actividad.tiempo}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}