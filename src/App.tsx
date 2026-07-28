import {
  AlertTriangle,
  BatteryCharging,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Gauge,
  Hash,
  KeyRound,
  LineChart,
  History,
  Eye,
  Loader2,
  Menu,
  PlugZap,
  ReceiptText,
  RefreshCw,
  RadioTower,
  UserRound,
  WalletCards,
  X,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadMeterDashboard } from './api/brebClient'
import { METER_OPTIONS } from './constants/meters'
import type { BasicConsumptionInfo, MeterDashboardData, RechargeHistoryRow } from './types/breb'
import {
  displayValue,
  formatAmount,
  formatDateTime,
  isUnavailable,
  toNumber,
} from './utils/format'
import './App.css'

type LoadStatus = 'idle' | 'loading' | 'success' | 'error'

type DashboardState = MeterDashboardData & {
  status: LoadStatus
  error: string | null
  loadedAt: Date | null
}

const initialDashboardState: DashboardState = {
  status: 'idle',
  error: null,
  loadedAt: null,
  basic: null,
  history: [],
  monthlyConsumption: [],
}

function App() {
  const [selectedMeterNo, setSelectedMeterNo] = useState(METER_OPTIONS[0].MeterNumber)
  const [dashboard, setDashboard] = useState<DashboardState>(initialDashboardState)
  const [selectedRecharge, setSelectedRecharge] = useState<RechargeHistoryRow | null>(null)
  const [isMeterDrawerOpen, setIsMeterDrawerOpen] = useState(false)

  const selectedMeter = useMemo(
    () =>
      METER_OPTIONS.find((meter) => meter.MeterNumber === selectedMeterNo) ??
      METER_OPTIONS[0],
    [selectedMeterNo],
  )

  const fetchMeterData = useCallback(
    async (signal?: AbortSignal) => {
      setDashboard((current) => ({
        ...current,
        status: 'loading',
        error: null,
      }))

      try {
        const data = await loadMeterDashboard(selectedMeterNo, signal)

        setDashboard({
          ...data,
          status: 'success',
          error: null,
          loadedAt: new Date(),
        })
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setDashboard((current) => ({
          ...current,
          status: 'error',
          error:
            error instanceof Error
              ? error.message
              : 'Unable to load meter data right now',
          loadedAt: null,
        }))
      }
    },
    [selectedMeterNo],
  )

  useEffect(() => {
    const controller = new AbortController()
    void fetchMeterData(controller.signal)

    return () => controller.abort()
  }, [fetchMeterData])

  const summary = useMemo(() => {
    const totalRecharged = dashboard.history.reduce(
      (sum, row) => sum + toNumber(row.totalAmount),
      0,
    )
    const totalEnergyAmount = dashboard.history.reduce(
      (sum, row) => sum + toNumber(row.energyAmount),
      0,
    )
    const tokenFailures = dashboard.history.filter(
      (row) => row.tokeSendStatus?.toLowerCase() === 'fail',
    ).length
    const latestHistory = dashboard.history[0]

    return {
      totalRecharged,
      totalEnergyAmount,
      averageRecharge:
        dashboard.history.length > 0 ? totalRecharged / dashboard.history.length : 0,
      latestChannel: latestHistory?.rechargedBy ?? null,
      tokenFailures,
    }
  }, [dashboard.history])

  const monthlySummary = useMemo(() => {
    const monthlyConsumption = dashboard.monthlyConsumption

    return {
      totalConsumptionAmount: sumMonthlyValue(monthlyConsumption, 'consAmount'),
      totalConsumptionUnits: sumMonthlyValue(monthlyConsumption, 'consUnit'),
      totalRecharge: sumMonthlyValue(monthlyConsumption, 'totalRecharge'),
      peakMaxUsedLoad: maxMonthlyValue(monthlyConsumption, 'maxUsedLoad'),
      peakConsumptionUnit: maxMonthlyValue(monthlyConsumption, 'consUnit') ?? 0,
    }
  }, [dashboard.monthlyConsumption])

  const isLoading = dashboard.status === 'loading'
  const isSuccess = dashboard.status === 'success'
  const hasHistory = dashboard.history.length > 0
  const hasMonthlyConsumption = dashboard.monthlyConsumption.length > 0

  useEffect(() => {
    if (!selectedRecharge) {
      return undefined
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedRecharge(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedRecharge])

  useEffect(() => {
    if (!isMeterDrawerOpen) {
      return undefined
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMeterDrawerOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMeterDrawerOpen])

  const handleMeterSelect = (meterNumber: string) => {
    setSelectedMeterNo(meterNumber)
    setIsMeterDrawerOpen(false)
  }

  return (
    <div className="dashboard-shell">
      <aside className="sidebar" aria-label="Meter navigation">
        <MeterNavigation
          selectedMeterNo={selectedMeterNo}
          onSelectMeter={handleMeterSelect}
        />
      </aside>

      <main className="workspace">
        <header className="topbar">
          <button
            aria-controls="meter-drawer"
            aria-expanded={isMeterDrawerOpen}
            className="mobile-menu-button"
            onClick={() => setIsMeterDrawerOpen(true)}
            type="button"
          >
            <Menu size={19} aria-hidden="true" />
            <span>Meters</span>
          </button>

          <div className="topbar-title">
            <p className="eyebrow">Selected meter</p>
            <h2>{selectedMeter.MeterLabel}</h2>
            <p className="meter-context">Meter number {selectedMeter.MeterNumber}</p>
          </div>

          <div className="topbar-actions">
            <StatusPill
              loadedAt={dashboard.loadedAt}
              status={dashboard.status}
              error={dashboard.error}
            />
            <button
              className="icon-button"
              disabled={isLoading}
              onClick={() => void fetchMeterData()}
              title="Refresh meter data"
              type="button"
            >
              <RefreshCw size={17} className={isLoading ? 'spin' : undefined} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {dashboard.status === 'error' && (
          <section className="alert-panel" role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            <div>
              <strong>Could not load this meter</strong>
              <p>{dashboard.error}</p>
            </div>
          </section>
        )}

        <section className="metrics-grid" aria-label="Consumption summary">
          <MetricCard
            icon={<WalletCards size={19} />}
            label="Last recharge"
            value={formatAmount(dashboard.basic?.lastRecharge)}
            meta={formatDateTime(dashboard.basic?.rechargeTime)}
            tone="green"
            unit="BDT"
          />
          <MetricCard
            icon={<BatteryCharging size={19} />}
            label="Remaining balance"
            value={formatAmount(dashboard.basic?.remainingBalance)}
            meta={`Reading ${displayValue(dashboard.basic?.readingTime)}`}
            tone="amber"
            unit="BDT"
          />
          <MetricCard
            icon={<Zap size={19} />}
            label="Used this month"
            value={displayUsage(dashboard.basic)}
            meta={`${formatAmount(dashboard.basic?.usedThisMonthTaka)} BDT`}
            tone="teal"
          />
          <MetricCard
            icon={<CalendarDays size={19} />}
            label="Recharged this year"
            value={formatAmount(dashboard.basic?.rechargedThisYear)}
            meta={`Last month ${formatAmount(dashboard.basic?.rechargedLastMonth)} BDT`}
            tone="neutral"
            unit="BDT"
          />
        </section>

        <section className="summary-band" aria-label="Recharge history summary">
          <div>
            <p className="eyebrow">Loaded history</p>
            <strong>{dashboard.history.length} records</strong>
          </div>
          <div>
            <p className="eyebrow">Total recharged</p>
            <strong>{formatAmount(summary.totalRecharged)} BDT</strong>
          </div>
          <div>
            <p className="eyebrow">Energy amount</p>
            <strong>{formatAmount(summary.totalEnergyAmount)} BDT</strong>
          </div>
          <div>
            <p className="eyebrow">Average recharge</p>
            <strong>{formatAmount(summary.averageRecharge)} BDT</strong>
          </div>
          <div>
            <p className="eyebrow">Latest channel</p>
            <strong>{displayValue(summary.latestChannel)}</strong>
          </div>
          <div>
            <p className="eyebrow">Token status</p>
            <strong>
              {hasHistory ? `${summary.tokenFailures} failed sends` : 'Unavailable'}
            </strong>
          </div>
        </section>

        <section className="history-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Recharge history</p>
              <h3>Last one year transactions</h3>
            </div>
            <div className="order-chip">
              <ReceiptText size={15} aria-hidden="true" />
              <span>{hasHistory ? `${dashboard.history.length} transactions` : 'No transactions'}</span>
            </div>
          </div>

          {isLoading && !isSuccess ? (
            <StatePanel icon={<Loader2 className="spin" size={22} />} title="Loading meter data" />
          ) : hasHistory ? (
            <RechargeTable history={dashboard.history} onViewDetails={setSelectedRecharge} />
          ) : (
            <StatePanel
              icon={<History size={22} />}
              title="No recharge history loaded"
              description="Select a meter or refresh to request the latest available data."
            />
          )}
        </section>

        <section className="monthly-panel" aria-label="Last 12 months consumption">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Monthly consumption</p>
              <h3>Last 12 months</h3>
            </div>
            <div className="order-chip">
              <LineChart size={15} aria-hidden="true" />
              <span>
                {hasMonthlyConsumption
                  ? `${dashboard.monthlyConsumption.length} months loaded`
                  : 'No monthly rows'}
              </span>
            </div>
          </div>

          <div className="monthly-insights" aria-label="Monthly consumption totals">
            <MonthlyInsight
              label="Consumption amount"
              value={formatMetricWithUnit(monthlySummary.totalConsumptionAmount, 'BDT')}
            />
            <MonthlyInsight
              label="Consumption units"
              value={formatMetricWithUnit(monthlySummary.totalConsumptionUnits, 'kWh')}
            />
            <MonthlyInsight
              label="Monthly recharge"
              value={formatMetricWithUnit(monthlySummary.totalRecharge, 'BDT')}
            />
            <MonthlyInsight
              label="Peak max load"
              value={formatMetricWithUnit(monthlySummary.peakMaxUsedLoad, 'kW')}
            />
          </div>

          {isLoading && !isSuccess ? (
            <StatePanel
              icon={<Loader2 className="spin" size={22} />}
              title="Loading monthly consumption"
            />
          ) : hasMonthlyConsumption ? (
            <MonthlyConsumptionList
              peakConsumptionUnit={monthlySummary.peakConsumptionUnit}
              rows={dashboard.monthlyConsumption}
            />
          ) : (
            <StatePanel
              icon={<CalendarDays size={22} />}
              title="No monthly consumption loaded"
              description="Monthly usage will appear here when the endpoint returns rows."
            />
          )}
        </section>
      </main>

      {selectedRecharge ? (
        <RechargeDetailsModal
          recharge={selectedRecharge}
          onClose={() => setSelectedRecharge(null)}
        />
      ) : null}

      <div
        className={`drawer-backdrop${isMeterDrawerOpen ? ' is-open' : ''}`}
        onMouseDown={() => setIsMeterDrawerOpen(false)}
      />
      <aside
        aria-hidden={!isMeterDrawerOpen}
        aria-label="Mobile meter navigation"
        className={`meter-drawer${isMeterDrawerOpen ? ' is-open' : ''}`}
        id="meter-drawer"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="drawer-header">
          <BrandBlock />
          <button
            aria-label="Close meter menu"
            className="drawer-close-button"
            onClick={() => setIsMeterDrawerOpen(false)}
            type="button"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <MeterNavigation
          selectedMeterNo={selectedMeterNo}
          onSelectMeter={handleMeterSelect}
          showBrand={false}
        />
      </aside>
    </div>
  )
}

function BrandBlock() {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">
        <PlugZap size={20} strokeWidth={2.4} />
      </span>
      <div>
        <p className="eyebrow">BREB prepaid</p>
        <h1>Meter Desk</h1>
      </div>
    </div>
  )
}

function MeterNavigation({
  selectedMeterNo,
  onSelectMeter,
  showBrand = true,
}: {
  selectedMeterNo: string
  onSelectMeter: (meterNumber: string) => void
  showBrand?: boolean
}) {
  return (
    <>
      {showBrand ? <BrandBlock /> : null}

      <nav className="meter-list" aria-label="Meters">
        {METER_OPTIONS.map((meter) => (
          <button
            className={`meter-button${
              meter.MeterNumber === selectedMeterNo ? ' is-selected' : ''
            }`}
            key={meter.MeterNumber}
            onClick={() => onSelectMeter(meter.MeterNumber)}
            type="button"
          >
            <span className="meter-icon" aria-hidden="true">
              <Gauge size={17} />
            </span>
            <span>
              <strong>{meter.MeterLabel}</strong>
              <small>{meter.MeterNumber}</small>
            </span>
          </button>
        ))}
      </nav>

      <div className="sidebar-note">
        <RadioTower size={16} aria-hidden="true" />
        <span>Live data is loaded through the Vite API proxy.</span>
      </div>
    </>
  )
}

function StatusPill({
  status,
  loadedAt,
  error,
}: {
  status: LoadStatus
  loadedAt: Date | null
  error: string | null
}) {
  if (status === 'loading') {
    return (
      <span className="status-pill is-loading">
        <Loader2 className="spin" size={15} aria-hidden="true" />
        Loading
      </span>
    )
  }

  if (status === 'error') {
    return (
      <span className="status-pill is-error" title={error ?? undefined}>
        <AlertTriangle size={15} aria-hidden="true" />
        Error
      </span>
    )
  }

  if (loadedAt) {
    return (
      <span className="status-pill is-live">
        <CheckCircle2 size={15} aria-hidden="true" />
        Loaded {loadedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    )
  }

  return <span className="status-pill">Idle</span>
}

function MetricCard({
  icon,
  label,
  value,
  meta,
  unit,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  meta: string
  unit?: string
  tone: 'green' | 'amber' | 'teal' | 'neutral'
}) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <div className="metric-icon" aria-hidden="true">
        {icon}
      </div>
      <div>
        <p>{label}</p>
        <strong>
          {value}
          {value !== 'Unavailable' && unit ? <small>{unit}</small> : null}
        </strong>
        <span>{meta}</span>
      </div>
    </article>
  )
}

function StatePanel({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description?: string
}) {
  return (
    <div className="state-panel">
      {icon}
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
    </div>
  )
}

function MonthlyInsight({ label, value }: { label: string; value: string }) {
  return (
    <div className="monthly-insight">
      <p className="eyebrow">{label}</p>
      <strong>{value}</strong>
    </div>
  )
}

function MonthlyConsumptionList({
  rows,
  peakConsumptionUnit,
}: {
  rows: MeterDashboardData['monthlyConsumption']
  peakConsumptionUnit: number
}) {
  return (
    <>
      <div className="monthly-table-wrap">
        <table className="monthly-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Consumption amount</th>
              <th>Consumption unit</th>
              <th>Max used load</th>
              <th>Total recharge</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.month ?? 'month'}-${index}`}>
                <td>
                  <strong>{displayValue(row.month)}</strong>
                  <UsageBar value={row.consUnit} peak={peakConsumptionUnit} />
                </td>
                <td>{formatValueWithUnit(row.consAmount, 'BDT')}</td>
                <td>{formatValueWithUnit(row.consUnit, 'kWh')}</td>
                <td>{formatValueWithUnit(row.maxUsedLoad, 'kW')}</td>
                <td>{formatValueWithUnit(row.totalRecharge, 'BDT')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="monthly-mobile-list" aria-label="Monthly consumption cards">
        {rows.map((row, index) => (
          <article className="monthly-mobile-card" key={`monthly-mobile-${row.month ?? index}`}>
            <div className="mobile-card-head">
              <div>
                <strong>{displayValue(row.month)}</strong>
                <small>Monthly endpoint row</small>
              </div>
              <UsageBar value={row.consUnit} peak={peakConsumptionUnit} />
            </div>

            <dl className="mobile-card-grid">
              <div>
                <dt>Amount</dt>
                <dd>{formatValueWithUnit(row.consAmount, 'BDT')}</dd>
              </div>
              <div>
                <dt>Units</dt>
                <dd>{formatValueWithUnit(row.consUnit, 'kWh')}</dd>
              </div>
              <div>
                <dt>Max load</dt>
                <dd>{formatValueWithUnit(row.maxUsedLoad, 'kW')}</dd>
              </div>
              <div>
                <dt>Recharge</dt>
                <dd>{formatValueWithUnit(row.totalRecharge, 'BDT')}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </>
  )
}

function UsageBar({ value, peak }: { value: string | null; peak: number }) {
  const numericValue = toNumber(value)
  const width = peak > 0 ? Math.max(4, (numericValue / peak) * 100) : 0
  const isZero = !isUnavailable(value) && numericValue === 0

  return (
    <span className="usage-bar" aria-hidden="true">
      <span
        className={`usage-bar-fill${isZero ? ' is-zero' : ''}`}
        style={{ width: `${isZero ? 4 : width}%` }}
      />
    </span>
  )
}

function RechargeTable({
  history,
  onViewDetails,
}: {
  history: MeterDashboardData['history']
  onViewDetails: (row: RechargeHistoryRow) => void
}) {
  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date/time</th>
              <th>Total</th>
              <th>Energy</th>
              <th>VAT</th>
              <th>Meter rent</th>
              <th>Demand</th>
              <th>Channel</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={`${row.orderNo ?? row.dateTime}-${row.meterseq ?? ''}`}>
                <td>
                  <strong>{formatDateTime(row.dateTime)}</strong>
                  <small>Seq {displayValue(row.meterseq)}</small>
                  <button
                    className="detail-button"
                    onClick={() => onViewDetails(row)}
                    type="button"
                  >
                    <Eye size={14} aria-hidden="true" />
                    <span>Details</span>
                  </button>
                </td>
                <td>{formatAmount(row.totalAmount)}</td>
                <td>{formatAmount(row.energyAmount)}</td>
                <td>{formatAmount(row.vat)}</td>
                <td>{formatAmount(row.meterRent)}</td>
                <td>{formatAmount(row.demandCharge)}</td>
                <td>{displayValue(row.rechargedBy)}</td>
                <td>
                  <TokenStatus status={row.tokeSendStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mobile-history-list" aria-label="Recharge history cards">
        {history.map((row) => (
          <article
            className="mobile-history-card"
            key={`mobile-${row.orderNo ?? row.dateTime}-${row.meterseq ?? ''}`}
          >
            <div className="mobile-card-head">
              <div>
                <strong>{formatDateTime(row.dateTime)}</strong>
                <small>Seq {displayValue(row.meterseq)}</small>
              </div>
              <div className="mobile-card-actions">
                <TokenStatus status={row.tokeSendStatus} />
                <button
                  className="detail-button"
                  onClick={() => onViewDetails(row)}
                  type="button"
                >
                  <Eye size={14} aria-hidden="true" />
                  <span>Details</span>
                </button>
              </div>
            </div>

            <dl className="mobile-card-grid">
              <div>
                <dt>Total</dt>
                <dd>{formatAmount(row.totalAmount)}</dd>
              </div>
              <div>
                <dt>Energy</dt>
                <dd>{formatAmount(row.energyAmount)}</dd>
              </div>
              <div>
                <dt>VAT</dt>
                <dd>{formatAmount(row.vat)}</dd>
              </div>
              <div>
                <dt>Rent</dt>
                <dd>{formatAmount(row.meterRent)}</dd>
              </div>
              <div>
                <dt>Demand</dt>
                <dd>{formatAmount(row.demandCharge)}</dd>
              </div>
              <div>
                <dt>Channel</dt>
                <dd>{displayValue(row.rechargedBy)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </>
  )
}

function RechargeDetailsModal({
  recharge,
  onClose,
}: {
  recharge: RechargeHistoryRow
  onClose: () => void
}) {
  const costRows = [
    ['Energy Cost', formatValueWithUnit(recharge.energyAmount, 'BDT')],
    ['Demand Charge', formatValueWithUnit(recharge.demandCharge, 'BDT')],
    ['Meter Rent', formatValueWithUnit(recharge.meterRent, 'BDT')],
    ['VAT', formatValueWithUnit(recharge.vat, 'BDT')],
    ['Rebate', formatValueWithUnit(recharge.rebate, 'BDT')],
  ]

  const secondaryFields = [
    ['Customer', displayValue(recharge.customerName)],
    ['Account no', displayValue(recharge.accountNo)],
    ['Order no', displayValue(recharge.orderNo)],
    ['Token send status', displayValue(recharge.tokeSendStatus)],
    ['Meter no', displayValue(recharge.meterNo)],
    ['Date/time', formatDateTime(recharge.dateTime)],
    ['Meter sequence', displayValue(recharge.meterseq)],
  ]

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        aria-labelledby="recharge-details-title"
        aria-modal="true"
        className="recharge-modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-title-icon" aria-hidden="true">
              <ReceiptText size={23} strokeWidth={2.2} />
            </span>
            <div>
              <p className="modal-kicker">Recharge transaction</p>
              <h3 id="recharge-details-title">Recharge Details</h3>
            </div>
          </div>
          <TokenStatus status={recharge.tokeSendStatus} />
          <button
            aria-label="Close transaction details"
            className="modal-close-button"
            onClick={onClose}
            type="button"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="modal-body">
          <div className="modal-accent-grid">
            <DetailAccentCard
              icon={<CalendarDays size={18} />}
              label="Purchase Date"
              value={formatDateTime(recharge.dateTime)}
            />
            <DetailAccentCard
              icon={<Gauge size={18} />}
              label="Meter No."
              value={displayValue(recharge.meterNo)}
            />
          </div>

          <section className="modal-section" aria-labelledby="cost-breakdown-title">
            <ModalSectionTitle
              icon={<CircleDollarSign size={18} />}
              id="cost-breakdown-title"
              title="Cost Breakdown"
            />
            <div className="cost-breakdown-card">
              <table className="cost-breakdown-table">
                <thead>
                  <tr>
                    <th>Particulars</th>
                    <th>Amount (TK)</th>
                  </tr>
                </thead>
                <tbody>
                  {costRows.map(([label, value]) => (
                    <tr key={label}>
                      <td>{label}</td>
                      <td>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="modal-section" aria-labelledby="token-information-title">
            <ModalSectionTitle
              icon={<KeyRound size={18} />}
              id="token-information-title"
              title="Token Information"
            />
            <div className="token-priority-block">
              <p>Recharge Token</p>
              <code>{formatRechargeToken(recharge.token)}</code>
            </div>
          </section>

          <div className="modal-accent-grid modal-accent-grid-secondary">
            <DetailAccentCard
              icon={<UserRound size={18} />}
              label="Recharged By"
              value={displayValue(recharge.rechargedBy)}
            />
            <DetailAccentCard
              icon={<Hash size={18} />}
              label="Sequence No."
              value={displayValue(recharge.meterseq)}
            />
          </div>

          <div className="modal-total-block">
            <span>Total Amount</span>
            <strong>{formatValueWithUnit(recharge.totalAmount, 'BDT')}</strong>
          </div>

          <dl className="modal-detail-grid" aria-label="Additional transaction details">
            {secondaryFields.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  )
}

function ModalSectionTitle({
  icon,
  id,
  title,
}: {
  icon: React.ReactNode
  id: string
  title: string
}) {
  return (
    <div className="modal-section-title">
      <span aria-hidden="true">{icon}</span>
      <h4 id={id}>{title}</h4>
    </div>
  )
}

function DetailAccentCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <article className="detail-accent-card">
      <span aria-hidden="true">{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  )
}

function TokenStatus({ status }: { status: string | null }) {
  return (
    <span
      className={`table-status ${
        status?.toLowerCase() === 'fail' ? 'is-fail' : 'is-ok'
      }`}
    >
      {displayValue(status)}
    </span>
  )
}

function displayUsage(basic: BasicConsumptionInfo | null): string {
  if (!basic?.usedThisMonthUnit) {
    return 'Unavailable'
  }

  return `${basic.usedThisMonthUnit} kWh`
}

function formatMetricWithUnit(value: number | null, unit: string): string {
  const formattedValue = formatAmount(value)

  return formattedValue === 'Unavailable' ? formattedValue : `${formattedValue} ${unit}`
}

function formatValueWithUnit(value: unknown, unit: string): string {
  const formattedValue = formatAmount(value)

  return formattedValue === 'Unavailable' ? formattedValue : `${formattedValue} ${unit}`
}

function formatRechargeToken(value: unknown): string {
  if (isUnavailable(value)) {
    return 'Unavailable'
  }

  const token = String(value).replace(/[\s-]/g, '')
  const groups = token.match(/.{1,4}/g)

  return groups ? groups.join('-') : 'Unavailable'
}

function sumMonthlyValue(
  rows: MeterDashboardData['monthlyConsumption'],
  key: keyof MeterDashboardData['monthlyConsumption'][number],
): number | null {
  let hasValue = false

  const total = rows.reduce((sum, row) => {
    const value = row[key]

    if (isUnavailable(value)) {
      return sum
    }

    hasValue = true
    return sum + toNumber(value)
  }, 0)

  return hasValue ? total : null
}

function maxMonthlyValue(
  rows: MeterDashboardData['monthlyConsumption'],
  key: keyof MeterDashboardData['monthlyConsumption'][number],
): number | null {
  let maxValue: number | null = null

  for (const row of rows) {
    const value = row[key]

    if (isUnavailable(value)) {
      continue
    }

    const numericValue = toNumber(value)
    maxValue = maxValue === null ? numericValue : Math.max(maxValue, numericValue)
  }

  return maxValue
}

export default App
