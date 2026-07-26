import { on } from '@/events/registry'
import { revalidatePath } from 'next/cache'
import { clearCache } from '@/lib/cache'

on('service.updated', async () => {
  revalidatePath('/')
  revalidatePath('/servicios')
  clearCache('services-')
})

on('service.deleted', async () => {
  revalidatePath('/')
  revalidatePath('/servicios')
  clearCache('services-')
})
