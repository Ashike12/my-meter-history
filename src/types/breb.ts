export type NullableString = string | null

export type ApiEnvelope<T> = {
  code?: string
  message?: string
  success?: boolean
  data: T
}

export type BasicConsumptionInfo = {
  lastRecharge: NullableString
  rechargeTime: NullableString
  remainingBalance: NullableString
  readingTime: NullableString
  usedThisMonthUnit: NullableString
  usedThisMonthTaka: NullableString
  rechargedLastMonth: NullableString
  rechargedThisYear: NullableString
  lastMonMaxLoad: NullableString
  lastYearMaxLoad: NullableString
}

export type RechargeHistoryRow = {
  dateTime: NullableString
  meterNo: NullableString
  customerName: NullableString
  accountNo: NullableString
  totalAmount: NullableString
  energyAmount: NullableString
  vat: NullableString
  rebate: NullableString
  meterRent: NullableString
  demandCharge: NullableString
  rechargedBy: NullableString
  tokeSendStatus: NullableString
  orderNo: NullableString
  token: NullableString
  meterseq: NullableString
}

export type MonthlyConsumptionRow = {
  month: NullableString
  consAmount: NullableString
  consUnit: NullableString
  maxUsedLoad: NullableString
  totalRecharge: NullableString
}

export type MeterDashboardData = {
  basic: BasicConsumptionInfo | null
  history: RechargeHistoryRow[]
  monthlyConsumption: MonthlyConsumptionRow[]
}
