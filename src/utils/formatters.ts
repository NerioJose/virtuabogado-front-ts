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
