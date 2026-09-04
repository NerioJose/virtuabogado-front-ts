import { prisma } from '@/lib/prisma'
import { UserRole } from '@/shared/types/entities.types'

const SYSTEM_EMAIL = 'sistema@virtuabogado.app'
const SYSTEM_NAME = 'VirtuAbogado'

export async function getSystemUserId(): Promise<string> {
  const user = await prisma.user.upsert({
    where: { email: SYSTEM_EMAIL },
    update: {
      rol: UserRole.ADMIN,
      activo: true,
    },
    create: {
      email: SYSTEM_EMAIL,
      nombre: SYSTEM_NAME,
      rol: UserRole.ADMIN,
      activo: true,
    },
  })
  return user.id
}
