import { defineConfig } from '@prisma/config';
import 'dotenv/config';

/**
 * Prisma 7 Config - VirtuAbogado 🏛️
 * Movimos la URL de conexión aquí para cumplir con el nuevo estándar de la v7.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
