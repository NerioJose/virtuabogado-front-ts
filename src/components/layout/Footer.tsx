import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-b from-azul-primario/95 to-azul-primario/80 text-white py-16 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Logo y descripción */}
        <div className="md:col-span-2 lg:col-span-1 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold">VirtuAbogado</h3>
          </div>
          <p className="text-azul-claro/80 leading-relaxed">
            Soluciones legales innovadoras para el mundo digital.
          </p>
        </div>

        {/* Enlaces rápidos */}
        <div className="space-y-6">
          <h4 className="text-lg font-semibold pb-2 border-b border-white/10">Enlaces</h4>
          <ul className="space-y-4">
            <li>
              <Link href="/terminos" className="group flex items-center gap-3 hover:text-azul-claro transition-colors">
                <span className="w-2 h-2 bg-azul-claro rounded-full group-hover:scale-125 transition-transform"></span>
                Términos y condiciones
              </Link>
            </li>
            <li>
              <Link href="/privacidad" className="group flex items-center gap-3 hover:text-azul-claro transition-colors">
                <span className="w-2 h-2 bg-azul-claro rounded-full group-hover:scale-125 transition-transform"></span>
                Política de privacidad
              </Link>
            </li>
            <li>
              <Link href="/contacto#faq" className="group flex items-center gap-3 hover:text-azul-claro transition-colors">
                <span className="w-2 h-2 bg-azul-claro rounded-full group-hover:scale-125 transition-transform"></span>
                Preguntas frecuentes
              </Link>
            </li>
          </ul>
        </div>

        {/* Contacto */}
        <div className="space-y-6">
          <h4 className="text-lg font-semibold pb-2 border-b border-white/10">Contacto</h4>
          <div className="space-y-4">
            <p className="flex items-center gap-3 text-azul-claro/80 hover:text-azul-claro transition-colors">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              virtuabogado.legal@gmail.com
            </p>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-white/10 mt-16 pt-8 text-center">
        <p className="text-sm text-white/70">
          © {new Date().getFullYear()} VirtuAbogado. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}