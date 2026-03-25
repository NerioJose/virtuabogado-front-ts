/**
 * Utilidades para formatear texto y datos en la plataforma
 */

/**
 * Capitaliza cada palabra de un nombre (nombres y apellidos)
 * @param name Nombre a capitalizar
 * @returns Nombre capitalizado (ej. "JUAN PEREZ" -> "Juan Perez")
 */
export const capitalizeName = (name: string | null | undefined): string => {
  if (!name) return '';
  
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Formatea el nombre de un abogado añadiendo el prefijo oficial y capitalizando.
 * @param name Nombre del abogado
 * @returns Nombre formateado (ej. "dr. juan perez" -> "Dr. Juan Perez")
 */
export const formatLawyerName = (name: string | null | undefined): string => {
  if (!name) return '';
  
  const trimmedName = name.trim();
  const lowerName = trimmedName.toLowerCase();
  
  // Lista de prefijos comunes para detectar si ya los tiene
  const prefixes = ['dr.', 'dra.', 'abog.', 'abg.', 'lic.'];
  
  const foundPrefix = prefixes.find(prefix => lowerName.startsWith(prefix));
  
  if (foundPrefix) {
    // Si ya tiene prefijo, capitalizamos el resto y normalizamos el prefijo
    const prefixLength = foundPrefix.length;
    const nameWithoutPrefix = trimmedName.slice(prefixLength).trim();
    const normalizedPrefix = foundPrefix.charAt(0).toUpperCase() + foundPrefix.slice(1);
    
    return `${normalizedPrefix} ${capitalizeName(nameWithoutPrefix)}`;
  }
  
  return `Dr. ${capitalizeName(trimmedName)}`;
};

/**
 * Formatea un número como moneda (USD por defecto)
 * @param amount Cantidad a formatear
 * @param currency Código de moneda (ej. "USD", "EUR")
 * @returns Cadena formateada (ej. 1250.5 -> "$1,250.50")
 */
export const formatCurrency = (
  amount: number | string | null | undefined,
  currency: string = 'USD'
): string => {
  if (amount === null || amount === undefined) return '$0.00';
  
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) return '$0.00';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
};

/**
 * Convierte una cadena en un slug amigable para URLs y nombres de archivo.
 * @param text Texto a convertir
 * @returns Slug (ej. "Asesoría Empresarial" -> "asesoria-empresarial")
 */
export const slugify = (text: string | null | undefined): string => {
  if (!text) return '';
  
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD') // Separar acentos de las letras
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/\s+/g, '-') // Reemplazar espacios por guiones
    .replace(/[^\w-]+/g, '') // Eliminar caracteres no permitidos
    .replace(/--+/g, '-'); // Eliminar guiones repetidos
};
