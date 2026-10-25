import { RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react'
import { useDeferredValue, useMemo, type ReactNode } from 'react'
import type { CheckResult, Rule, Status, Table } from '../../engine'
import { describeRule } from '../rules/CheckPanel'
import { copy, fmt, statusLabel } from '../copy'
import { Section } from '../shell/Section'
import type { CheckedWith } from '../../io/exportXlsx'
import { PrintReport } from './PrintReport'
import { ResultsTable } from './ResultsTable'
import { RowDetail } from './RowDetail'
import { STATUS_ICON, STATUS_ICON_COLOR, STATUS_SOFT, STATUS_TEXT } from './Status'

const STATUSES: Status[] = ['eligible', 'not-eligible', 'review']
export const countOf = (r: CheckResult, s: Status) => (s === 'eligible' ? r.counts.eligible : s === 'not-eligible' ? r.counts.notEligible : r.counts.review)
const pct = (n: number, total: number) => `${Math.round((n / Math.max(total, 1)) * 100)}%`

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
  const seg: [Status, string][] = [
    ['eligible', 'bg-ok'],
    ['not-eligible', 'bg-no'],
    ['review', 'bg-review-mark'],
  ]
  return (
    <div className="flex h-2 overflow-hidden rounded-sm bg-line" aria-hidden="true">
      {seg.map(([s, c]) => (
        <span key={s} className={c} style={{ width: pct(countOf(result, s), result.counts.total) }} />
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
        const n = countOf(result, s)
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
              <span className="tnum text-xl font-semibold text-ink" data-count={n}>{fmt(n)}</span>
              <span className="tnum text-xs text-muted">{pct(n, result.counts.total)}</span>
            </span>
            <span className="text-xs text-muted">{on ? 'Showing only these · click to show all' : 'Click to show only these'}</span>
          </button>
        )
      })}
    </div>
  )
}

export function RuleImpact({ table, result, rules }: { table: Table; result: CheckResult; rules: Rule[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th scope="col" className="py-2 pr-4 font-medium">Check</th>
            <th scope="col" className="py-2 pr-4 text-right font-medium">Made not eligible</th>
            <th scope="col" className="py-2 text-right font-medium">Sent to review</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule, k) => {
            const imp = result.impact[k]!
            return (
              <tr key={rule.id} className="border-b border-line">
                <td className="py-2 pr-4 font-mono text-xs">{describeRule(rule, table.headers)}</td>
                <td className="tnum py-2 pr-4 text-right">{fmt(imp.failed)}</td>
                <td className="tnum py-2 text-right">{fmt(imp.review)}</td>
              </tr>
            )
          })}
          <tr className="border-b border-line">
            <td className="py-2 pr-4 text-xs">Repeated IDs</td>
            <td className="tnum py-2 pr-4 text-right text-muted">—</td>
            <td className="tnum py-2 text-right">{fmt(result.duplicateIdRows)}</td>
          </tr>
          <tr>
            <td className="py-2 pr-4 text-xs">Possible duplicate students</td>
            <td className="tnum py-2 pr-4 text-right text-muted">—</td>
            <td className="tnum py-2 text-right">{fmt(result.likelyDuplicateRows)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted">A student can be counted by more than one check.</p>
    </div>
  )
}

const EMPTY: Record<Status, string> = {
  eligible: 'No students are eligible.',
  'not-eligible': 'No students are not eligible.',
  review: 'No students need review.',
}

interface Props {
  table: Table
  result: CheckResult
  rules: Rule[]
  checked: CheckedWith
  idColumn: string
  nameColumn: string
  filter: Status | null
  search: string
  selectedRow: number | null
  actions?: ReactNode
  onFilter: (s: Status | null) => void
  onSearch: (q: string) => void
  onOpenRow: (i: number | null) => void
  onChangeRules: () => void
  onStartOver: () => void
}

export function ResultsStage(p: Props) {
  const { table, result, rules, filter } = p
  const query = useDeferredValue(p.search.trim().toLowerCase())
  const haystack = useMemo(() => table.rows.map((cells) => cells.map((c) => c.raw).join('\u0001').toLowerCase()), [table])
  const shown = useMemo(
    () => result.order.filter((i) => (!filter || result.rows[i]!.status === filter) && (!query || haystack[i]!.includes(query))),
    [result, filter, query, haystack],
  )
  const columns = [...new Set([p.idColumn, p.nameColumn, ...rules.map((r) => r.column)].filter(Boolean))]

  return (
    <>
    <PrintReport table={table} result={result} checked={p.checked} rows={shown} filter={filter} search={p.search} />
    <div className="space-y-5 print:hidden">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <CheckedLine result={result} fileName={table.fileName} />
        <div className="flex flex-wrap gap-2 print:hidden">
          {p.actions}
          <button type="button" className="btn" onClick={p.onChangeRules}>
            <SlidersHorizontal size={16} aria-hidden="true" />
            {copy.changeRules}
          </button>
          <button type="button" className="btn btn-quiet" onClick={p.onStartOver}>
            <RotateCcw size={16} aria-hidden="true" />
            {copy.startOver}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <Counters result={result} filter={filter} onFilter={p.onFilter} />
        <SplitBar result={result} />
      </div>

      <div className="grid items-start gap-5 min-[1100px]:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="students-title" className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <h2 id="students-title" className="text-base font-semibold">Students</h2>
            <span className="tnum text-xs text-muted" aria-live="polite">
              Showing {fmt(shown.length)} of {fmt(result.counts.total)}
              {filter && ` · ${statusLabel[filter]} only`}
            </span>
            {filter && (
              <button type="button" className="btn btn-quiet px-2 py-0.5 text-xs" onClick={() => p.onFilter(null)}>
                <X size={14} aria-hidden="true" /> Show all
              </button>
            )}
            <div className="relative ml-auto w-full sm:w-72">
              <Search size={16} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted" aria-hidden="true" />
              <label htmlFor="search" className="sr-only">Search students</label>
              <input
                id="search"
                type="search"
                className="field w-full pl-8"
                placeholder="Search ID, name or any value"
                value={p.search}
                onChange={(e) => p.onSearch(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted print:hidden">Needs review first, then Not eligible, then Eligible. Click a row to see every cell and reason.</p>

          {shown.length === 0 ? (
            <div className="rounded-md border border-dashed border-line-strong px-4 py-8 text-center text-sm text-muted">
              {query ? (
                <>
                  No students match &lsquo;{p.search.trim()}&rsquo;.{' '}
                  <button type="button" className="text-accent underline underline-offset-2" onClick={() => p.onSearch('')}>
                    Clear search
                  </button>
                </>
              ) : (
                EMPTY[filter ?? 'review']
              )}
            </div>
          ) : (
            <ResultsTable table={table} result={result} rows={shown} columns={columns} selected={p.selectedRow} onOpen={(i) => p.onOpenRow(i)} />
          )}
        </section>

        <div className="min-[1100px]:sticky min-[1100px]:top-4">
          <Section title="What each rule did" hint="Counts per check, across all students.">
            <RuleImpact table={table} result={result} rules={rules} />
          </Section>
        </div>
      </div>

      {p.selectedRow !== null && <RowDetail table={table} result={result} rules={rules} index={p.selectedRow} onClose={() => p.onOpenRow(null)} />}
    </div>
    </>
  )
}
