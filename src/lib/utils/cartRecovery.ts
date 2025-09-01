// Utilidad para gestionar la recuperación de carritos abandonados

interface ServiceData {
  nombre: string;
  descripcion: string;
  precio: number | string;
}

// Función para guardar los datos del servicio seleccionado
export const saveCartData = (serviceData: ServiceData) => {
  try {
    // Guardar datos del servicio en localStorage
    localStorage.setItem('abandonedCart', JSON.stringify({
      service: serviceData,
      timestamp: new Date().toISOString(),
      recovered: false
    }));
  } catch (error) {
    console.error('Error al guardar datos del carrito:', error);
  }
};

// Función para comprobar si hay un carrito abandonado
export const checkAbandonedCart = () => {
  try {
    const cartData = localStorage.getItem('abandonedCart');
    if (!cartData) return null;
    
    const parsedData = JSON.parse(cartData);
    
    // Comprobar si el carrito tiene más de 1 hora de antigüedad
    const cartTime = new Date(parsedData.timestamp).getTime();
    const currentTime = new Date().getTime();
    const hourInMs = 60 * 60 * 1000;
    
    if (currentTime - cartTime > hourInMs && !parsedData.recovered) {
      return parsedData.service;
    }
    
    return null;
  } catch (error) {
    console.error('Error al comprobar carrito abandonado:', error);
    return null;
  }
};

// Función para marcar un carrito como recuperado
export const markCartAsRecovered = () => {
  try {
    const cartData = localStorage.getItem('abandonedCart');
    if (!cartData) return;
    
    const parsedData = JSON.parse(cartData);
    parsedData.recovered = true;
    
    localStorage.setItem('abandonedCart', JSON.stringify(parsedData));
  } catch (error) {
    console.error('Error al marcar carrito como recuperado:', error);
  }
};

// Función para eliminar datos del carrito
export const clearCartData = () => {
  localStorage.removeItem('abandonedCart');
};