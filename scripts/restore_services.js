const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Restaurando catálogo extendido de servicios...');

  const services = [
    {
      id: 4,
      titulo: 'Representación Legal',
      descripcion: 'Asesoría y defensa profesional en procesos judiciales, civiles y administrativos.',
      precio: 150.00,
      activo: false,
      imagenUrl: '/images/representacion-legal.png'
    },
    {
      id: 5,
      titulo: 'Asesoría Empresarial',
      descripcion: 'Asistencia en constitución de empresas, contratos mercantiles y registro de marcas.',
      precio: 85.00,
      activo: false,
      imagenUrl: '/images/asesoria-empresarial.png'
    },
    {
      id: 6,
      titulo: 'Derecho Familiar',
      descripcion: 'Gestión de divorcios, pensiones alimenticias, custodias y sucesiones hereditarias.',
      precio: 120.00,
      activo: false,
      imagenUrl: '/images/derecho-familiar.png'
    },
    {
      id: 7,
      titulo: 'Derecho Inmobiliario',
      descripcion: 'Asesoría en compraventa, arrendamientos, hipotecas y saneamiento de propiedades.',
      precio: 95.00,
      activo: false,
      imagenUrl: '/images/derecho-inmobiliario.png'
    }
  ];

  for (const service of services) {
    const s = await prisma.service.upsert({
      where: { id: service.id },
      update: {
        titulo: service.titulo,
        descripcion: service.descripcion,
        precio: service.precio,
        activo: service.activo,
        imagenUrl: service.imagenUrl
      },
      create: service
    });
    console.log(`✅ Servicio "${s.titulo}" (ID: ${s.id}) sincronizado como INACTIVO.`);
  }

  console.log('✨ Restauración completada.');
}

main()
  .catch((e) => {
    console.error('❌ Error restaurando servicios:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
