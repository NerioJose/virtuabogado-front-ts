'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { 
  FiUsers, 
  FiUserCheck, 
  FiBriefcase, 
  FiDollarSign, 
  FiMessageSquare,
  FiPlusCircle,
  FiEdit,
  FiTrash2,
  FiEye,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiSearch,
  FiFilter,
  FiRefreshCw
} from 'react-icons/fi';

// Tipos de datos
interface Abogado {
  id: number;
  nombre: string;
  email: string;
  especialidad: string;
  casos_asignados: number;
  casos_completados: number;
  valoracion: number;
  estado: 'online' | 'offline';
  ingresos_totales: number;
  pagos_pendientes: number;
}

interface Cliente {
  id: number;
  nombre: string;
  email: string;
  casos_activos: number;
  casos_completados: number;
  fecha_registro: string;
  estado: 'online' | 'offline';
  pagos_totales: number;
}

interface Caso {
  id: number;
  titulo: string;
  cliente_id: number;
  cliente_nombre: string;
  abogado_id: number | null;
  abogado_nombre: string | null;
  estado: 'pendiente' | 'asignado' | 'en_proceso' | 'completado' | 'cancelado';
  fecha_creacion: string;
  fecha_asignacion: string | null;
  fecha_completado: string | null;
  tipo: string;
  prioridad: 'baja' | 'media' | 'alta';
  valor: number;
  pagado: boolean;
}

interface Transaccion {
  id: number;
  tipo: 'ingreso' | 'pago_abogado' | 'gasto';
  monto: number;
  fecha: string;
  concepto: string;
  caso_id: number | null;
  abogado_id: number | null;
  estado: 'pendiente' | 'completado';
}

interface EstadisticasFinancieras {
  ingresos_totales: number;
  pagos_abogados: number;
  ganancias_netas: number;
  pagos_pendientes: number;
  ingresos_mes_actual: number;
  comparativa_mes_anterior: number;
}

export default function AdminPage() {
  // Estados para los datos
  const [abogados, setAbogados] = useState<Abogado[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [casos, setCasos] = useState<Caso[]>([]);
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [estadisticasFinancieras, setEstadisticasFinancieras] = useState<EstadisticasFinancieras>({
    ingresos_totales: 0,
    pagos_abogados: 0,
    ganancias_netas: 0,
    pagos_pendientes: 0,
    ingresos_mes_actual: 0,
    comparativa_mes_anterior: 0
  });

  // Estado para la sección activa
  const [seccionActiva, setSeccionActiva] = useState<'abogados' | 'clientes' | 'casos' | 'finanzas' | 'chat'>('abogados');
  
  // Estados para modales
  const [modalAbierto, setModalAbierto] = useState(false);
  const [tipoModal, setTipoModal] = useState<'crear' | 'editar' | 'eliminar' | 'ver' | 'asignar'>('crear');
  const [elementoSeleccionado, setElementoSeleccionado] = useState<any>(null);
  
  // Estados para filtros y búsqueda
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [filtros, setFiltros] = useState<Record<string, any>>({});

  // Datos de ejemplo (simulando respuesta de API)
  useEffect(() => {
    // Simulación de carga de datos
    const cargarDatos = () => {
      // Datos de abogados
      const datosAbogados: Abogado[] = [
        {
          id: 1,
          nombre: 'Laura Martínez',
          email: 'laura.martinez@virtuabogado.com',
          especialidad: 'Derecho Mercantil',
          casos_asignados: 8,
          casos_completados: 45,
          valoracion: 4.8,
          estado: 'online',
          ingresos_totales: 15000,
          pagos_pendientes: 2500
        },
        {
          id: 2,
          nombre: 'Carlos Rodríguez',
          email: 'carlos.rodriguez@virtuabogado.com',
          especialidad: 'Derecho Laboral',
          casos_asignados: 5,
          casos_completados: 32,
          valoracion: 4.5,
          estado: 'offline',
          ingresos_totales: 12000,
          pagos_pendientes: 1800
        },
        {
          id: 3,
          nombre: 'Ana García',
          email: 'ana.garcia@virtuabogado.com',
          especialidad: 'Derecho Familiar',
          casos_asignados: 10,
          casos_completados: 28,
          valoracion: 4.7,
          estado: 'online',
          ingresos_totales: 9500,
          pagos_pendientes: 1200
        }
      ];
      
      // Datos de clientes
      const datosClientes: Cliente[] = [
        {
          id: 1,
          nombre: 'Miguel Fernández',
          email: 'miguel.fernandez@gmail.com',
          casos_activos: 2,
          casos_completados: 3,
          fecha_registro: '2023-05-15',
          estado: 'offline',
          pagos_totales: 1800
        },
        {
          id: 2,
          nombre: 'Sofía López',
          email: 'sofia.lopez@empresa.com',
          casos_activos: 1,
          casos_completados: 0,
          fecha_registro: '2023-08-22',
          estado: 'online',
          pagos_totales: 500
        },
        {
          id: 3,
          nombre: 'Javier Moreno',
          email: 'javier.moreno@outlook.com',
          casos_activos: 0,
          casos_completados: 5,
          fecha_registro: '2022-11-10',
          estado: 'offline',
          pagos_totales: 3200
        }
      ];
      
      // Datos de casos
      const datosCasos: Caso[] = [
        {
          id: 1,
          titulo: 'Revisión de contrato laboral',
          cliente_id: 1,
          cliente_nombre: 'Miguel Fernández',
          abogado_id: 2,
          abogado_nombre: 'Carlos Rodríguez',
          estado: 'en_proceso',
          fecha_creacion: '2023-09-10',
          fecha_asignacion: '2023-09-12',
          fecha_completado: null,
          tipo: 'Revisión de documentos',
          prioridad: 'media',
          valor: 500,
          pagado: true
        },
        {
          id: 2,
          titulo: 'Consulta sobre divorcio',
          cliente_id: 2,
          cliente_nombre: 'Sofía López',
          abogado_id: 3,
          abogado_nombre: 'Ana García',
          estado: 'asignado',
          fecha_creacion: '2023-10-05',
          fecha_asignacion: '2023-10-06',
          fecha_completado: null,
          tipo: 'Consulta legal',
          prioridad: 'baja',
          valor: 300,
          pagado: true
        },
        {
          id: 3,
          titulo: 'Constitución de sociedad limitada',
          cliente_id: 1,
          cliente_nombre: 'Miguel Fernández',
          abogado_id: 1,
          abogado_nombre: 'Laura Martínez',
          estado: 'completado',
          fecha_creacion: '2023-08-15',
          fecha_asignacion: '2023-08-16',
          fecha_completado: '2023-09-05',
          tipo: 'Trámite legal',
          prioridad: 'alta',
          valor: 1200,
          pagado: true
        },
        {
          id: 4,
          titulo: 'Reclamación por despido improcedente',
          cliente_id: 3,
          cliente_nombre: 'Javier Moreno',
          abogado_id: null,
          abogado_nombre: null,
          estado: 'pendiente',
          fecha_creacion: '2023-10-18',
          fecha_asignacion: null,
          fecha_completado: null,
          tipo: 'Representación legal',
          prioridad: 'alta',
          valor: 1500,
          pagado: false
        }
      ];
      
      // Datos de transacciones
      const datosTransacciones: Transaccion[] = [
        {
          id: 1,
          tipo: 'ingreso',
          monto: 500,
          fecha: '2023-09-10',
          concepto: 'Pago por revisión de contrato laboral',
          caso_id: 1,
          abogado_id: null,
          estado: 'completado'
        },
        {
          id: 2,
          tipo: 'ingreso',
          monto: 300,
          fecha: '2023-10-05',
          concepto: 'Pago por consulta sobre divorcio',
          caso_id: 2,
          abogado_id: null,
          estado: 'completado'
        },
        {
          id: 3,
          tipo: 'ingreso',
          monto: 1200,
          fecha: '2023-08-15',
          concepto: 'Pago por constitución de sociedad limitada',
          caso_id: 3,
          abogado_id: null,
          estado: 'completado'
        },
        {
          id: 4,
          tipo: 'pago_abogado',
          monto: 350,
          fecha: '2023-09-15',
          concepto: 'Pago a abogado por caso #1',
          caso_id: 1,
          abogado_id: 2,
          estado: 'completado'
        },
        {
          id: 5,
          tipo: 'pago_abogado',
          monto: 210,
          fecha: '2023-10-10',
          concepto: 'Pago a abogado por caso #2',
          caso_id: 2,
          abogado_id: 3,
          estado: 'pendiente'
        },
        {
          id: 6,
          tipo: 'pago_abogado',
          monto: 840,
          fecha: '2023-09-10',
          concepto: 'Pago a abogado por caso #3',
          caso_id: 3,
          abogado_id: 1,
          estado: 'completado'
        },
        {
          id: 7,
          tipo: 'gasto',
          monto: 150,
          fecha: '2023-09-20',
          concepto: 'Gastos administrativos',
          caso_id: null,
          abogado_id: null,
          estado: 'completado'
        }
      ];
      
      // Datos de estadísticas financieras
      const datosEstadisticas: EstadisticasFinancieras = {
        ingresos_totales: 2000,
        pagos_abogados: 1400,
        ganancias_netas: 450,
        pagos_pendientes: 210,
        ingresos_mes_actual: 800,
        comparativa_mes_anterior: 15 // porcentaje de incremento
      };
      
      setAbogados(datosAbogados);
      setClientes(datosClientes);
      setCasos(datosCasos);
      setTransacciones(datosTransacciones);
      setEstadisticasFinancieras(datosEstadisticas);
    };
    
    cargarDatos();
  }, []);

  // Funciones para gestionar abogados
  const crearAbogado = (nuevoAbogado: Omit<Abogado, 'id' | 'casos_asignados' | 'casos_completados' | 'valoracion' | 'ingresos_totales' | 'pagos_pendientes'>) => {
    const abogadoCompleto: Abogado = {
      ...nuevoAbogado,
      id: abogados.length + 1,
      casos_asignados: 0,
      casos_completados: 0,
      valoracion: 0,
      ingresos_totales: 0,
      pagos_pendientes: 0
    };
    
    setAbogados([...abogados, abogadoCompleto]);
    cerrarModal();
  };
  
  const editarAbogado = (id: number, datosActualizados: Partial<Abogado>) => {
    setAbogados(abogados.map(abogado => 
      abogado.id === id ? { ...abogado, ...datosActualizados } : abogado
    ));
    cerrarModal();
  };
  
  const eliminarAbogado = (id: number) => {
    setAbogados(abogados.filter(abogado => abogado.id !== id));
    cerrarModal();
  };

  // Funciones para gestionar clientes
  const crearCliente = (nuevoCliente: Omit<Cliente, 'id' | 'casos_activos' | 'casos_completados' | 'fecha_registro' | 'pagos_totales'>) => {
    const clienteCompleto: Cliente = {
      ...nuevoCliente,
      id: clientes.length + 1,
      casos_activos: 0,
      casos_completados: 0,
      fecha_registro: new Date().toISOString().split('T')[0],
      pagos_totales: 0
    };
    
    setClientes([...clientes, clienteCompleto]);
    cerrarModal();
  };
  
  const editarCliente = (id: number, datosActualizados: Partial<Cliente>) => {
    setClientes(clientes.map(cliente => 
      cliente.id === id ? { ...cliente, ...datosActualizados } : cliente
    ));
    cerrarModal();
  };
  
  const eliminarCliente = (id: number) => {
    setClientes(clientes.filter(cliente => cliente.id !== id));
    cerrarModal();
  };

  // Funciones para gestionar casos
  const crearCaso = (nuevoCaso: Omit<Caso, 'id' | 'abogado_id' | 'abogado_nombre' | 'fecha_asignacion' | 'fecha_completado'>) => {
    const casoCompleto: Caso = {
      ...nuevoCaso,
      id: casos.length + 1,
      abogado_id: null,
      abogado_nombre: null,
      fecha_asignacion: null,
      fecha_completado: null
    };
    
    setCasos([...casos, casoCompleto]);
    cerrarModal();
  };
  
  const editarCaso = (id: number, datosActualizados: Partial<Caso>) => {
    setCasos(casos.map(caso => 
      caso.id === id ? { ...caso, ...datosActualizados } : caso
    ));
    cerrarModal();
  };
  
  const eliminarCaso = (id: number) => {
    setCasos(casos.filter(caso => caso.id !== id));
    cerrarModal();
  };
  
  const asignarCasoAbogado = (casoId: number, abogadoId: number) => {
    const abogadoSeleccionado = abogados.find(a => a.id === abogadoId);
    
    if (abogadoSeleccionado) {
      setCasos(casos.map(caso => 
        caso.id === casoId ? { 
          ...caso, 
          abogado_id: abogadoId, 
          abogado_nombre: abogadoSeleccionado.nombre,
          estado: 'asignado' as const,
          fecha_asignacion: new Date().toISOString().split('T')[0]
        } : caso
      ));
      
      setAbogados(abogados.map(abogado => 
        abogado.id === abogadoId ? { 
          ...abogado, 
          casos_asignados: abogado.casos_asignados + 1 
        } : abogado
      ));
    }
    
    cerrarModal();
  };

  // Funciones para gestionar transacciones
  const crearTransaccion = (nuevaTransaccion: Omit<Transaccion, 'id'>) => {
    const transaccionCompleta: Transaccion = {
      ...nuevaTransaccion,
      id: transacciones.length + 1
    };
    
    setTransacciones([...transacciones, transaccionCompleta]);
    
    // Actualizar estadísticas financieras
    if (nuevaTransaccion.tipo === 'ingreso') {
      setEstadisticasFinancieras({
        ...estadisticasFinancieras,
        ingresos_totales: estadisticasFinancieras.ingresos_totales + nuevaTransaccion.monto,
        ingresos_mes_actual: estadisticasFinancieras.ingresos_mes_actual + nuevaTransaccion.monto,
        ganancias_netas: estadisticasFinancieras.ganancias_netas + nuevaTransaccion.monto
      });
    } else if (nuevaTransaccion.tipo === 'pago_abogado') {
      setEstadisticasFinancieras({
        ...estadisticasFinancieras,
        pagos_abogados: estadisticasFinancieras.pagos_abogados + nuevaTransaccion.monto,
        ganancias_netas: estadisticasFinancieras.ganancias_netas - nuevaTransaccion.monto,
        pagos_pendientes: nuevaTransaccion.estado === 'pendiente' 
          ? estadisticasFinancieras.pagos_pendientes + nuevaTransaccion.monto 
          : estadisticasFinancieras.pagos_pendientes
      });
      
      // Actualizar datos del abogado si existe
      if (nuevaTransaccion.abogado_id) {
        setAbogados(abogados.map(abogado => 
          abogado.id === nuevaTransaccion.abogado_id ? { 
            ...abogado, 
            ingresos_totales: abogado.ingresos_totales + nuevaTransaccion.monto,
            pagos_pendientes: nuevaTransaccion.estado === 'pendiente' 
              ? abogado.pagos_pendientes + nuevaTransaccion.monto 
              : abogado.pagos_pendientes
          } : abogado
        ));
      }
    } else if (nuevaTransaccion.tipo === 'gasto') {
      setEstadisticasFinancieras({
        ...estadisticasFinancieras,
        ganancias_netas: estadisticasFinancieras.ganancias_netas - nuevaTransaccion.monto
      });
    }
    
    cerrarModal();
  };
  
  const actualizarEstadoTransaccion = (id: number, nuevoEstado: 'pendiente' | 'completado') => {
    const transaccion = transacciones.find(t => t.id === id);
    
    if (transaccion && transaccion.tipo === 'pago_abogado' && transaccion.estado !== nuevoEstado) {
      // Actualizar la transacción
      setTransacciones(transacciones.map(t => 
        t.id === id ? { ...t, estado: nuevoEstado } : t
      ));
      
      // Actualizar estadísticas financieras
      if (nuevoEstado === 'completado') {
        setEstadisticasFinancieras({
          ...estadisticasFinancieras,
          pagos_pendientes: estadisticasFinancieras.pagos_pendientes - transaccion.monto
        });
        
        // Actualizar datos del abogado si existe
        if (transaccion.abogado_id) {
          setAbogados(abogados.map(abogado => 
            abogado.id === transaccion.abogado_id ? { 
              ...abogado, 
              pagos_pendientes: abogado.pagos_pendientes - transaccion.monto
            } : abogado
          ));
        }
      } else {
        setEstadisticasFinancieras({
          ...estadisticasFinancieras,
          pagos_pendientes: estadisticasFinancieras.pagos_pendientes + transaccion.monto
        });
        
        // Actualizar datos del abogado si existe
        if (transaccion.abogado_id) {
          setAbogados(abogados.map(abogado => 
            abogado.id === transaccion.abogado_id ? { 
              ...abogado, 
              pagos_pendientes: abogado.pagos_pendientes + transaccion.monto
            } : abogado
          ));
        }
      }
    }
  };

  // Funciones para modales
  const abrirModal = (tipo: 'crear' | 'editar' | 'eliminar' | 'ver' | 'asignar', elemento?: any) => {
    setTipoModal(tipo);
    setElementoSeleccionado(elemento || null);
    setModalAbierto(true);
  };
  
  const cerrarModal = () => {
    setModalAbierto(false);
    setElementoSeleccionado(null);
  };

  // Funciones de filtrado
  const filtrarAbogados = () => {
    return abogados.filter(abogado => 
      abogado.nombre.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
      abogado.email.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
      abogado.especialidad.toLowerCase().includes(terminoBusqueda.toLowerCase())
    );
  };
  
  const filtrarClientes = () => {
    return clientes.filter(cliente => 
      cliente.nombre.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
      cliente.email.toLowerCase().includes(terminoBusqueda.toLowerCase())
    );
  };
  
  const filtrarCasos = () => {
    let casosFiltrados = casos;
    
    // Aplicar filtro de búsqueda
    if (terminoBusqueda) {
      casosFiltrados = casosFiltrados.filter(caso => 
        caso.titulo.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
        caso.cliente_nombre?.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
        caso.abogado_nombre?.toLowerCase().includes(terminoBusqueda.toLowerCase())
      );
    }
    
    // Aplicar filtros adicionales
    if (filtros.estado) {
      casosFiltrados = casosFiltrados.filter(caso => caso.estado === filtros.estado);
    }
    
    if (filtros.prioridad) {
      casosFiltrados = casosFiltrados.filter(caso => caso.prioridad === filtros.prioridad);
    }
    
    return casosFiltrados;
  };
  
  const filtrarTransacciones = () => {
    let transaccionesFiltradas = transacciones;
    
    // Aplicar filtro de búsqueda
    if (terminoBusqueda) {
      transaccionesFiltradas = transaccionesFiltradas.filter(transaccion => 
        transaccion.concepto.toLowerCase().includes(terminoBusqueda.toLowerCase())
      );
    }
    
    // Aplicar filtros adicionales
    if (filtros.tipo) {
      transaccionesFiltradas = transaccionesFiltradas.filter(transaccion => transaccion.tipo === filtros.tipo);
    }
    
    if (filtros.estado) {
      transaccionesFiltradas = transaccionesFiltradas.filter(transaccion => transaccion.estado === filtros.estado);
    }
    
    return transaccionesFiltradas;
  };

  // Renderizado de componentes
  const renderizarMenuLateral = () => {
    return (
      <div className="w-64 bg-azul-primario text-white h-screen fixed left-0 top-0 overflow-y-auto">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-8">VirtuAbogado</h1>
          
          <nav className="space-y-2">
            <button 
              onClick={() => setSeccionActiva('abogados')}
              className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${seccionActiva === 'abogados' ? 'bg-white text-azul-primario' : 'hover:bg-azul-primario/80'}`}
            >
              <FiUserCheck className="text-xl" />
              <span>Abogados</span>
            </button>
            
            <button 
              onClick={() => setSeccionActiva('clientes')}
              className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${seccionActiva === 'clientes' ? 'bg-white text-azul-primario' : 'hover:bg-azul-primario/80'}`}
            >
              <FiUsers className="text-xl" />
              <span>Clientes</span>
            </button>
            
            <button 
              onClick={() => setSeccionActiva('casos')}
              className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${seccionActiva === 'casos' ? 'bg-white text-azul-primario' : 'hover:bg-azul-primario/80'}`}
            >
              <FiBriefcase className="text-xl" />
              <span>Casos</span>
            </button>
            
            <button 
              onClick={() => setSeccionActiva('finanzas')}
              className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${seccionActiva === 'finanzas' ? 'bg-white text-azul-primario' : 'hover:bg-azul-primario/80'}`}
            >
              <FiDollarSign className="text-xl" />
              <span>Finanzas</span>
            </button>
            
            <button 
              onClick={() => setSeccionActiva('chat')}
              className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${seccionActiva === 'chat' ? 'bg-white text-azul-primario' : 'hover:bg-azul-primario/80'}`}
            >
              <FiMessageSquare className="text-xl" />
              <span>Chat</span>
            </button>
          </nav>
        </div>


        <div className="p-6 border-t border-azul-primario/30">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-azul-primario">
              <span className="font-bold">A</span>
            </div>
            <div>
              <p className="font-medium">Admin</p>
              <p className="text-sm text-azul-claro">Administrador</p>
            </div>
          </div>
          
          <button className="w-full mt-4 p-2 border border-white/30 rounded-lg text-sm hover:bg-white/10 transition-colors">
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  };

  const renderizarSeccionAbogados = () => {
    const abogadosFiltrados = filtrarAbogados();
    
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-azul-primario">Gestión de Abogados</h2>
          <button 
            onClick={() => abrirModal('crear')}
            className="btn-primary flex items-center gap-2"
          >
            <FiPlusCircle />
            <span>Nuevo Abogado</span>
          </button>
        </div>
        
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar abogado..."
              value={terminoBusqueda}
              onChange={(e) => setTerminoBusqueda(e.target.value)}
              className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-primario focus:border-azul-primario"
            />
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Abogado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Especialidad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Casos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valoración</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Finanzas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {abogadosFiltrados.map((abogado) => (
                  <tr key={abogado.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-azul-claro flex items-center justify-center text-azul-primario">
                          <span className="font-bold">{abogado.nombre.charAt(0)}</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{abogado.nombre}</div>
                          <div className="text-sm text-gray-500">{abogado.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-azul-claro/20 text-azul-primario">
                        {abogado.especialidad}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>Asignados: {abogado.casos_asignados}</div>
                      <div>Completados: {abogado.casos_completados}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-900 mr-2">{abogado.valoracion}</span>
                        <div className="flex text-yellow-400">
                          {[...Array(5)].map((_, i) => (
                            <svg key={i} className={`w-4 h-4 ${i < Math.floor(abogado.valoracion) ? 'fill-current' : 'stroke-current fill-none'}`} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${abogado.estado === 'online' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {abogado.estado === 'online' ? 'En línea' : 'Desconectado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>Ingresos: {abogado.ingresos_totales.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div>
                      <div>Pendiente: {abogado.pagos_pendientes.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => abrirModal('ver', abogado)}
                          className="text-azul-primario hover:text-azul-primario/80"
                          title="Ver detalles"
                        >
                          <FiEye />
                        </button>
                        <button 
                          onClick={() => abrirModal('editar', abogado)}
                          className="text-amber-600 hover:text-amber-500"
                          title="Editar"
                        >
                          <FiEdit />
                        </button>
                        <button 
                          onClick={() => abrirModal('eliminar', abogado)}
                          className="text-red-600 hover:text-red-500"
                          title="Eliminar"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderizarSeccionClientes = () => {
    const clientesFiltrados = filtrarClientes();
    
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-azul-primario">Gestión de Clientes</h2>
          <button 
            onClick={() => abrirModal('crear')}
            className="btn-primary flex items-center gap-2"
          >
            <FiPlusCircle />
            <span>Nuevo Cliente</span>
          </button>
        </div>
        
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={terminoBusqueda}
              onChange={(e) => setTerminoBusqueda(e.target.value)}
              className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-primario focus:border-azul-primario"
            />
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Casos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Registro</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pagos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-vinotinto/20 flex items-center justify-center text-vinotinto">
                          <span className="font-bold">{cliente.nombre.charAt(0)}</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{cliente.nombre}</div>
                          <div className="text-sm text-gray-500">{cliente.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>Activos: {cliente.casos_activos}</div>
                      <div>Completados: {cliente.casos_completados}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(cliente.fecha_registro).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${cliente.estado === 'online' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {cliente.estado === 'online' ? 'En línea' : 'Desconectado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cliente.pagos_totales.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => abrirModal('ver', cliente)}
                          className="text-azul-primario hover:text-azul-primario/80"
                          title="Ver detalles"
                        >
                          <FiEye />
                        </button>
                        <button 
                          onClick={() => abrirModal('editar', cliente)}
                          className="text-amber-600 hover:text-amber-500"
                          title="Editar"
                        >
                          <FiEdit />
                        </button>
                        <button 
                          onClick={() => abrirModal('eliminar', cliente)}
                          className="text-red-600 hover:text-red-500"
                          title="Eliminar"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderizarSeccionCasos = () => {
    const casosFiltrados = filtrarCasos();
    
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-azul-primario">Gestión de Casos</h2>
          <button 
            onClick={() => abrirModal('crear')}
            className="btn-primary flex items-center gap-2"
          >
            <FiPlusCircle />
            <span>Nuevo Caso</span>
          </button>
        </div>
        
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar caso..."
              value={terminoBusqueda}
              onChange={(e) => setTerminoBusqueda(e.target.value)}
              className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-primario focus:border-azul-primario"
            />
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Caso</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Abogado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fechas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {casosFiltrados.map((caso) => (
                  <tr key={caso.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-azul-claro/20 flex items-center justify-center text-azul-primario">
                          <FiBriefcase />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{caso.titulo}</div>
                          <div className="text-sm text-gray-500">{caso.tipo}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{caso.cliente_nombre}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {caso.abogado_nombre ? (
                        <div className="text-sm text-gray-900">{caso.abogado_nombre}</div>
                      ) : (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Sin asignar
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        caso.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                        caso.estado === 'asignado' ? 'bg-blue-100 text-blue-800' :
                        caso.estado === 'en_proceso' ? 'bg-indigo-100 text-indigo-800' :
                        caso.estado === 'completado' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {caso.estado === 'pendiente' ? 'Pendiente' :
                         caso.estado === 'asignado' ? 'Asignado' :
                         caso.estado === 'en_proceso' ? 'En proceso' :
                         caso.estado === 'completado' ? 'Completado' :
                         'Cancelado'}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        Prioridad: <span className={`font-medium ${
                          caso.prioridad === 'alta' ? 'text-red-600' :
                          caso.prioridad === 'media' ? 'text-amber-600' :
                          'text-green-600'
                        }`}>
                          {caso.prioridad === 'alta' ? 'Alta' :
                           caso.prioridad === 'media' ? 'Media' :
                           'Baja'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>Creación: {new Date(caso.fecha_creacion).toLocaleDateString('es-ES')}</div>
                      {caso.fecha_asignacion && (
                        <div>Asignación: {new Date(caso.fecha_asignacion).toLocaleDateString('es-ES')}</div>
                      )}
                      {caso.fecha_completado && (
                        <div>Completado: {new Date(caso.fecha_completado).toLocaleDateString('es-ES')}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{caso.valor.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div>
                      <div className={`text-xs ${caso.pagado ? 'text-green-600' : 'text-red-600'}`}>
                        {caso.pagado ? 'Pagado' : 'Pendiente de pago'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => abrirModal('ver', caso)}
                          className="text-azul-primario hover:text-azul-primario/80"
                          title="Ver detalles"
                        >
                          <FiEye />
                        </button>
                        <button 
                          onClick={() => abrirModal('editar', caso)}
                          className="text-amber-600 hover:text-amber-500"
                          title="Editar"
                        >
                          <FiEdit />
                        </button>
                        {!caso.abogado_id && (
                          <button 
                            onClick={() => abrirModal('asignar', caso)}
                            className="text-blue-600 hover:text-blue-500"
                            title="Asignar abogado"
                          >
                            <FiUserCheck />
                          </button>
                        )}
                        <button 
                          onClick={() => abrirModal('eliminar', caso)}
                          className="text-red-600 hover:text-red-500"
                          title="Eliminar"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderizarSeccionFinanzas = () => {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-azul-primario">Gestión Financiera</h2>
          <button 
            onClick={() => abrirModal('crear')}
            className="btn-primary flex items-center gap-2"
          >
            <FiPlusCircle />
            <span>Nueva Transacción</span>
          </button>
        </div>
        
        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500 mb-1">Ingresos Totales</p>
                <h3 className="text-2xl font-bold text-gray-800">
                  {estadisticasFinancieras.ingresos_totales.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                </h3>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <FiDollarSign className="text-green-600 text-xl" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className={`${estadisticasFinancieras.comparativa_mes_anterior > 0 ? 'text-green-600' : 'text-red-600'} font-medium`}>
                {estadisticasFinancieras.comparativa_mes_anterior > 0 ? '+' : ''}{estadisticasFinancieras.comparativa_mes_anterior}%
              </span>
              <span className="text-gray-500 ml-2">vs. mes anterior</span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500 mb-1">Pagos a Abogados</p>
                <h3 className="text-2xl font-bold text-gray-800">
                  {estadisticasFinancieras.pagos_abogados.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                </h3>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <FiUserCheck className="text-blue-600 text-xl" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-500">
                {((estadisticasFinancieras.pagos_abogados / estadisticasFinancieras.ingresos_totales) * 100).toFixed(1)}% de los ingresos
              </span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-purple-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500 mb-1">Ganancias Netas</p>
                <h3 className="text-2xl font-bold text-gray-800">
                  {estadisticasFinancieras.ganancias_netas.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                </h3>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <FiDollarSign className="text-purple-600 text-xl" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-500">
                {((estadisticasFinancieras.ganancias_netas / estadisticasFinancieras.ingresos_totales) * 100).toFixed(1)}% de margen
              </span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-amber-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500 mb-1">Pagos Pendientes</p>
                <h3 className="text-2xl font-bold text-gray-800">
                  {estadisticasFinancieras.pagos_pendientes.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                </h3>
              </div>
              <div className="p-2 bg-amber-100 rounded-lg">
                <FiClock className="text-amber-600 text-xl" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-amber-600 font-medium">
                {transacciones.filter(t => t.estado === 'pendiente').length} transacciones pendientes
              </span>
            </div>
          </div>
        </div>
        
        {/* Tabla de transacciones */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-azul-primario">Historial de Transacciones</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Concepto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transacciones.map((transaccion) => (
                  <tr key={transaccion.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(transaccion.fecha).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{transaccion.concepto}</div>
                      {transaccion.caso_id && (
                        <div className="text-xs text-gray-500">Caso #{transaccion.caso_id}</div>
                      )}
                      {transaccion.abogado_id && (
                        <div className="text-xs text-gray-500">
                          Abogado: {abogados.find(a => a.id === transaccion.abogado_id)?.nombre || 'Desconocido'}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        transaccion.tipo === 'ingreso' ? 'bg-green-100 text-green-800' :
                        transaccion.tipo === 'pago_abogado' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {transaccion.tipo === 'ingreso' ? 'Ingreso' :
                         transaccion.tipo === 'pago_abogado' ? 'Pago a abogado' :
                         'Gasto'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={`${
                        transaccion.tipo === 'ingreso' ? 'text-green-600' :
                        'text-red-600'
                      }`}>
                        {transaccion.tipo === 'ingreso' ? '+' : '-'}
                        {transaccion.monto.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        transaccion.estado === 'completado' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {transaccion.estado === 'completado' ? 'Completado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {transaccion.tipo === 'pago_abogado' && transaccion.estado === 'pendiente' && (
                          <button 
                            onClick={() => actualizarEstadoTransaccion(transaccion.id, 'completado')}
                            className="text-green-600 hover:text-green-500"
                            title="Marcar como completado"
                          >
                            <FiCheckCircle />
                          </button>
                        )}
                        <button 
                          onClick={() => abrirModal('ver', transaccion)}
                          className="text-azul-primario hover:text-azul-primario/80"
                          title="Ver detalles"
                        >
                          <FiEye />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderizarSeccionChat = () => {
    return (
      <div className="h-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-azul-primario">Chat de Soporte</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
          {/* Lista de conversaciones */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden lg:col-span-1">
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar conversación..."
                  className="w-full p-2 pl-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-primario focus:border-azul-primario text-sm"
                />
                <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              </div>
            </div>
            <div className="overflow-y-auto h-[calc(100vh-280px)]">
              {[
                { id: 1, nombre: 'Miguel Fernández', mensaje: 'Necesito información sobre mi caso', tiempo: '10:30', noLeidos: 2 },
                { id: 2, nombre: 'Laura Martínez', mensaje: 'Gracias por la información', tiempo: 'Ayer', noLeidos: 0 },
                { id: 3, nombre: 'Carlos Rodríguez', mensaje: '¿Cuándo podemos agendar una reunión?', tiempo: 'Lun', noLeidos: 0 },
                { id: 4, nombre: 'Ana García', mensaje: 'He enviado los documentos solicitados', tiempo: '23/10', noLeidos: 1 },
              ].map((chat) => (
                <div key={chat.id} className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${chat.id === 1 ? 'bg-azul-claro/10' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-azul-claro flex items-center justify-center text-azul-primario flex-shrink-0">
                      <span className="font-bold">{chat.nombre.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-medium text-gray-900 truncate">{chat.nombre}</h4>
                        <span className="text-xs text-gray-500">{chat.tiempo}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{chat.mensaje}</p>
                    </div>
                    {chat.noLeidos > 0 && (
                      <div className="w-5 h-5 rounded-full bg-vinotinto flex items-center justify-center text-white text-xs">
                        {chat.noLeidos}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Área de chat */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden lg:col-span-3 flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-azul-claro flex items-center justify-center text-azul-primario">
                <span className="font-bold">M</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Miguel Fernández</h4>
                <p className="text-xs text-gray-500">En línea</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 h-[calc(100vh-350px)]">
              {[
                { id: 1, emisor: 'cliente', mensaje: 'Hola, necesito información sobre mi caso de revisión de contrato laboral.', tiempo: '10:15' },
                { id: 2, emisor: 'admin', mensaje: 'Claro Miguel, ¿qué información específica necesitas?', tiempo: '10:20' },
                { id: 3, emisor: 'cliente', mensaje: 'Quería saber si ya tienen alguna actualización o si el abogado ha revisado los documentos que envié la semana pasada.', tiempo: '10:22' },
                { id: 4, emisor: 'admin', mensaje: 'Déjame verificar eso por ti. Dame un momento por favor.', tiempo: '10:25' },
                { id: 5, emisor: 'cliente', mensaje: 'Gracias, espero tu respuesta.', tiempo: '10:26' },
              ].map((mensaje) => (
                <div key={mensaje.id} className={`flex ${mensaje.emisor === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-lg p-3 ${
                    mensaje.emisor === 'admin' 
                      ? 'bg-azul-primario text-white rounded-br-none' 
                      : 'bg-gray-100 text-gray-800 rounded-bl-none'
                  }`}>
                    <p className="text-sm">{mensaje.mensaje}</p>
                    <p className={`text-xs mt-1 text-right ${
                      mensaje.emisor === 'admin' ? 'text-azul-claro/80' : 'text-gray-500'
                    }`}>{mensaje.tiempo}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Escribe un mensaje..."
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-primario focus:border-azul-primario"
                />
                <button className="p-3 bg-azul-primario text-white rounded-lg hover:bg-azul-primario/90 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Función para filtrar casos según el término de búsqueda
  const filtrarCasos = () => {
    if (!terminoBusqueda.trim()) return casos;
    
    const termino = terminoBusqueda.toLowerCase();
    return casos.filter(caso => 
      caso.titulo.toLowerCase().includes(termino) ||
      caso.cliente_nombre.toLowerCase().includes(termino) ||
      (caso.abogado_nombre && caso.abogado_nombre.toLowerCase().includes(termino))
    );
  };

  // Renderizado condicional según la sección activa
  const renderizarContenidoPrincipal = () => {
    switch (seccionActiva) {
      case 'abogados':
        return renderizarSeccionAbogados();
      case 'clientes':
        return renderizarSeccionClientes();
      case 'casos':
        return renderizarSeccionCasos();
      case 'finanzas':
        return renderizarSeccionFinanzas();
      case 'chat':
        return renderizarSeccionChat();
      default:
        return renderizarSeccionAbogados();
    }
  };
            <button 
              onClick={() => setSeccionActiva('finanzas')}
              className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${seccionActiva === 'finanzas' ? 'bg-white text-azul-primario' : 'hover:bg-azul-primario/80'}`}
            >
              <FiDollarSign className="text-xl" />
              <span>Finanzas</span>
            </button>
            
            <button 
              onClick={() => setSeccionActiva('chat')}
              className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${seccionActiva === 'chat' ? 'bg-white text-azul-primario' : 'hover:bg-azul-primario/80'}`}
            >
              <FiMessageSquare className="text-xl" />
              <span>Chat</span>
            </button>
          </nav>
        </div>
      </div>
    );
  };

  const renderizarContenido = () => {
    switch (seccionActiva) {
      case 'abogados':
        return renderizarSeccionAbogados();
      case 'clientes':
        return renderizarSeccionClientes();
      case 'casos':
        return renderizarSeccionCasos();
      case 'finanzas':
        return renderizarSeccionFinanzas();
      case 'chat':
        return renderizarSeccionChat();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gris-fondo">
      {renderizarMenuLateral()}
      <div className="ml-64 p-8">
        {renderizarContenido()}
      </div>
    </div>
  );
}
