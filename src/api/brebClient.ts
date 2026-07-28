import type {
  ApiEnvelope,
  BasicConsumptionInfo,
  MeterDashboardData,
  MonthlyConsumptionRow,
  RechargeHistoryRow,
} from '../types/breb'

const API_BASE = '/api/breb-customer/cust'

const ENDPOINTS = {
  basicConsumption: 'basicElecConsumInfo',
  monthlyConsumption: 'last12MonthlyConsForm',
  rechargeHistory: 'lastOneYearRechargeHistory',
} as const

async function fetchEndpoint<T>(
  endpoint: string,
  meterNo: string,
  signal?: AbortSignal,
): Promise<T> {
  const params = new URLSearchParams({ meterNo })
  const response = await fetch(`${API_BASE}/${endpoint}?${params}`, { signal })

  if (!response.ok) {
    throw new Error(`BREB API returned ${response.status}`)
  }

  const payload = (await response.json()) as ApiEnvelope<T>

  if (payload.success === false || (payload.code && payload.code !== '0')) {
    throw new Error(payload.message || 'BREB API returned an unsuccessful response')
  }

  return payload.data
}

export async function loadMeterDashboard(
  meterNo: string,
  signal?: AbortSignal,
): Promise<MeterDashboardData> {
  const [basic, monthlyConsumption, history] = await Promise.all([
    fetchEndpoint<BasicConsumptionInfo | null>(
      ENDPOINTS.basicConsumption,
      meterNo,
      signal,
    ),
    fetchEndpoint<MonthlyConsumptionRow[] | null>(
      ENDPOINTS.monthlyConsumption,
      meterNo,
      signal,
    ),
    fetchEndpoint<RechargeHistoryRow[] | null>(
      ENDPOINTS.rechargeHistory,
      meterNo,
      signal,
    ),
  ])

  return {
    basic,
    monthlyConsumption: Array.isArray(monthlyConsumption) ? monthlyConsumption : [],
    history: Array.isArray(history) ? history : [],
  }
}
