// Servicio para analizar abandonos de compra

type AbandonmentReason = 
  | 'payment_error' 
  | 'form_validation' 
  | 'user_left' 
  | 'timeout' 
  | 'other';

type AbandonmentData = {
  timestamp: string;
  page: string;
  reason: AbandonmentReason;
  serviceId?: string;
  serviceName?: string;
  errorCode?: string;
  userEmail?: string;
};

// Función para registrar un abandono de compra
export const logAbandonment = (data: Omit<AbandonmentData, 'timestamp'>) => {
  try {
    // Obtener datos anteriores
    const previousData = localStorage.getItem('abandonmentAnalytics');
    const analytics = previousData ? JSON.parse(previousData) : [];
    
    // Añadir nuevo registro
    analytics.push({
      ...data,
      timestamp: new Date().toISOString()
    });
    
    // Guardar datos actualizados
    localStorage.setItem('abandonmentAnalytics', JSON.stringify(analytics));
    
    // En una implementación real, aquí enviaríamos los datos a un servicio de analítica
    // sendToAnalyticsService(data);
    
    
  } catch (error) {
    console.error('Error al registrar abandono:', error);
  }
};

// Función para obtener estadísticas de abandonos
export const getAbandonmentStats = () => {
  try {
    const data = localStorage.getItem('abandonmentAnalytics');
    if (!data) return { total: 0, byReason: {} };
    
    const analytics = JSON.parse(data);
    
    // Calcular estadísticas
    const total = analytics.length;
    const byReason = analytics.reduce((acc: Record<string, number>, item: AbandonmentData) => {
      acc[item.reason] = (acc[item.reason] || 0) + 1;
      return acc;
    }, {});
    
    return { total, byReason };
  } catch (error) {
    console.error('Error al obtener estadísticas de abandonos:', error);
    return { total: 0, byReason: {} };
  }
};

// Función para limpiar datos de analítica (solo para desarrollo)
export const clearAnalyticsData = () => {
  localStorage.removeItem('abandonmentAnalytics');
};