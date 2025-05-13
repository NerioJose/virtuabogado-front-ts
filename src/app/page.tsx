export default function Home() {
  return (
    <main className="min-h-screen pt-20 px-4 md:px-8 lg:px-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-azul-primario mb-6">
          Este es el home
        </h1>
        <p className="text-lg text-gray-700 mb-8">
          Bienvenido a VirtuAbogado - Asesoría legal en línea
        </p>
        <button className="btn-primary">
          Conoce nuestros servicios
        </button>
      </div>
    </main>
  );
}
