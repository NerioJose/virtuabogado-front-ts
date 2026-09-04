export type MercadoPagoDocType = 'DNI' | 'C.E' | 'RUC' | 'Otro';

const VALID_DOC_TYPES: MercadoPagoDocType[] = ['DNI', 'C.E', 'RUC', 'Otro'];

/**
 * Valida/normaliza el tipo de documento que entrega el Brick de MercadoPago
 * (o el usuario) contra los valores EXACTOS que acepta la API de pagos para
 * Perú (MPE): DNI, C.E, RUC, Otro.
 *
 * IMPORTANTE: el valor "C.E" lleva PUNTO y NO debe quitarse. El Brick ya
 * entrega los valores correctos (usa los identification_types de MP), así que
 * esta función NO modifica el string: solo comprueba que sea uno de los
 * válidos (con tolerancia de mayúsculas/espacios/abreviaturas comunes) y
 * devuelve el valor canónico. Si no coincide, devuelve null.
 */
export function normalizeMercadoPagoDocType(raw?: string): MercadoPagoDocType | null {
    if (!raw) return null;
    const input = String(raw).trim();
    if (!input) return null;

    const norm = (s: string) => s.toUpperCase().replace(/\s+/g, '');

    // Coincidencia exacta o normalizada (C.E se normaliza a C.E, sin quitar punto).
    for (const valid of VALID_DOC_TYPES) {
        if (norm(input) === norm(valid)) return valid;
    }

    // Abreviaturas/alias comunes → valor canónico.
    const aliases: Record<string, MercadoPagoDocType> = {
        CE: 'C.E',
        'CARNETDEEXTRANJERIA': 'C.E',
        'CARNEDEEXTRANJERIA': 'C.E',
        'CARNEXT': 'C.E',
        'DOCUMENTONACIONALDEIDENTIDAD': 'DNI',
        'REGISTROUNICODECONTRIBUYENTES': 'RUC',
    };
    const key = norm(input);
    if (aliases[key]) return aliases[key];

    return null;
}
