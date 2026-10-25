import { RotateCcw, SlidersHorizontal } from 'lucide-react'
import type { CheckResult, Rule, Status, Table } from '../../engine'
import { copy, fmt, statusLabel } from '../copy'
import { STATUS_ICON, STATUS_ICON_COLOR, STATUS_SOFT, STATUS_TEXT, StatusBadge } from './Status'

const STATUSES: Status[] = ['eligible', 'not-eligible', 'review']
const countOf = (r: CheckResult, s: Status) => (s === 'eligible' ? r.counts.eligible : s === 'not-eligible' ? r.counts.notEligible : r.counts.review)

export function CheckedLine({ result, fileName }: { result: CheckResult; fileName: string }) {
  const { total, eligible, notEligible, review } = result.counts
  return (
    <div>
      <p className="eyebrow">Results · {fileName}</p>
      <h1 className="tnum mt-1 text-xl font-semibold tracking-tight">
        {fmt(total)} of {fmt(total)} students checked
      </h1>
      <p className="sr-only" aria-live="polite">
        {`${fmt(eligible)} eligible, ${fmt(notEligible)} not eligible, ${fmt(review)} need review.`}
      </p>
    </div>
  )
}

/** One bar, three segments, proportional to the counts. Text labels sit in the counters. */
export function SplitBar({ result }: { result: CheckResult }) {
  const { total } = result.counts
  const seg: [Status, string][] = [
    ['eligible', 'bg-ok'],
    ['not-eligible', 'bg-no'],
    ['review', 'bg-review-mark'],
  ]
  return (
    <div className="flex h-2 overflow-hidden rounded-sm bg-line" aria-hidden="true">
      {seg.map(([s, c]) => (
        <span key={s} className={c} style={{ width: `${(countOf(result, s) / Math.max(total, 1)) * 100}%` }} />
      ))}
    </div>
  )
}

export function Counters({ result, filter, onFilter }: { result: CheckResult; filter: Status | null; onFilter: (s: Status | null) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="Filter by group">
      {STATUSES.map((s) => {
        const Icon = STATUS_ICON[s]
        const on = filter === s
        return (
          <button
            key={s}
            type="button"
            aria-pressed={on}
            onClick={() => onFilter(on ? null : s)}
            className={`flex flex-col items-start gap-1 rounded-md border px-4 py-3 text-left transition-colors ${
              on ? `${STATUS_SOFT[s]} border-current ${STATUS_TEXT[s]}` : 'border-line bg-surface hover:border-line-strong'
            }`}
          >
            <span className={`flex items-center gap-1.5 text-sm font-medium ${STATUS_TEXT[s]}`}>
              <Icon size={16} className={STATUS_ICON_COLOR[s]} aria-hidden="true" />
              {statusLabel[s]}
            </span>
            <span className="flex items-baseline gap-2">
              <span className="tnum text-xl font-semibold text-ink" data-count={countOf(result, s)}>{fmt(countOf(result, s))}</span>
              <span className="tnum text-xs text-muted">{Math.round((countOf(result, s) / Math.max(result.counts.total, 1)) * 100)}%</span>
            </span>
            <span className="text-xs text-muted">{on ? 'Showing only these · click to show all' : 'Click to show only these'}</span>
          </button>
        )
      })}
    </div>
  )
}

interface Props {
  table: Table
  result: CheckResult
  rules: Rule[]
  idColumn: string
  nameColumn: string
  filter: Status | null
  onFilter: (s: Status | null) => void
  onChangeRules: () => void
  onStartOver: () => void
}

/** The first version of the results screen: counts and a table of the first rows. */
export function ResultsStage({ table, result, rules, idColumn, nameColumn, filter, onFilter, onChangeRules, onStartOver }: Props) {
  const cols = [...new Set([idColumn, nameColumn, ...rules.map((r) => r.column)].filter(Boolean))]
  const colIdx = cols.map((c) => table.headers.indexOf(c))
  const shown = result.order.filter((i) => !filter || result.rows[i]!.status === filter).slice(0, 200)
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <CheckedLine result={result} fileName={table.fileName} />
        <div className="flex flex-wrap gap-2 print:hidden">
          <button type="button" className="btn" onClick={onChangeRules}>
            <SlidersHorizontal size={16} aria-hidden="true" />
            {copy.changeRules}
          </button>
          <button type="button" className="btn btn-quiet" onClick={onStartOver}>
            <RotateCcw size={16} aria-hidden="true" />
            {copy.startOver}
          </button>
        </div>
      </div>
      <div className="space-y-3">
        <Counters result={result} filter={filter} onFilter={onFilter} />
        <SplitBar result={result} />
      </div>
      <div className="overflow-x-auto rounded-md border border-line bg-surface">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-bg text-left text-xs text-muted">
              <th scope="col" className="px-3 py-2 font-medium">Row</th>
              {cols.map((c) => (
                <th key={c} scope="col" className="px-3 py-2 font-medium whitespace-nowrap">{c}</th>
              ))}
              <th scope="col" className="px-3 py-2 font-medium">Status</th>
              <th scope="col" className="px-3 py-2 font-medium">Reason</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((i) => (
              <tr key={i} className="border-b border-line align-top last:border-0">
                <td className="tnum px-3 py-2 font-mono text-xs text-muted">{table.rowNumbers[i]}</td>
                {colIdx.map((c, k) => (
                  <td key={k} className="px-3 py-2 font-mono text-xs whitespace-pre">{table.rows[i]![c]!.raw}</td>
                ))}
                <td className="px-3 py-2"><StatusBadge status={result.rows[i]!.status} /></td>
                <td className="px-3 py-2">{result.rows[i]!.reasons.join(' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
