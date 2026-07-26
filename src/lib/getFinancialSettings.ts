import { prisma } from '@/lib/prisma'
import { FINANCIAL_SETTINGS_ID } from '@/lib/constants'
import { getCached, setCache } from '@/lib/cache'

const CACHE_KEY = 'financial-settings'
const CACHE_TTL_MS = 30_000

export interface FinancialSettingsData {
  lawyer_commission_percentage: number
  operational_costs_percentage: number
  tax_percentage: number
  platform_fee_percentage: number
  simulation_base?: number
  whatsappPhone?: string | null
}

export async function getFinancialSettingsCached(): Promise<FinancialSettingsData> {
  const cached = getCached<FinancialSettingsData>(CACHE_KEY)
  if (cached) return cached

  const settings = await prisma.financialSettings.findUnique({
    where: { id: FINANCIAL_SETTINGS_ID },
  })

  const result: FinancialSettingsData = settings
    ? {
        lawyer_commission_percentage: Number(settings.lawyer_commission_percentage),
        operational_costs_percentage: Number(settings.operational_costs_percentage),
        tax_percentage: Number(settings.tax_percentage),
        platform_fee_percentage: Number(settings.platform_fee_percentage),
      }
    : {
        lawyer_commission_percentage: 0,
        operational_costs_percentage: 0,
        tax_percentage: 0,
        platform_fee_percentage: 0,
      }

  setCache(CACHE_KEY, result, CACHE_TTL_MS)
  return result
}
