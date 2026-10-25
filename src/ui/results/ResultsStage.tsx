import { FileSpreadsheet, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { compareWithFormula, formulaText, type CheckResult, type Rule, type Status, type Table } from '../../engine/core'
import { describeRule } from '../rules/CheckPanel'
import { copy, fmt, statusLabel } from '../copy'
import type { CheckedWith } from '../../io/time'
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
      <p className="eyebrow">Step 3 of 3 · Results · {fileName}</p>
      <h1 className="tnum mt-1 text-xl font-semibold tracking-tight">
        {fmt(total)} of {fmt(total)} students checked
      </h1>
      <p className="sr-only" aria-live="polite">
        {`${fmt(eligible)} eligible, ${fmt(notEligible)} not eligible, ${fmt(review)} need review.`}
      </p>
    </div>
  )
}

const BAR: Record<Status, string> = { eligible: 'bg-ok', 'not-eligible': 'bg-no', review: 'bg-review-mark' }
const TOP: Record<Status, string> = { eligible: 'border-t-ok', 'not-eligible': 'border-t-no', review: 'border-t-review-mark' }

/** The tally: three ruled columns that also filter the table, with one proportion bar underneath. */
export function Counters({ result, filter, onFilter }: { result: CheckResult; filter: Status | null; onFilter: (s: Status | null) => void }) {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-surface">
      <div className="grid grid-cols-3" role="group" aria-label="Filter by group">
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
              className={`group flex min-w-0 flex-col items-start gap-1 border-t-2 border-r border-r-line px-3 py-3 text-left transition-colors last:border-r-0 sm:px-5 sm:py-4 ${
                on ? `${STATUS_SOFT[s]} ${TOP[s]}` : 'border-t-transparent hover:bg-bg'
              }`}
            >
              <span className={`flex items-center gap-1.5 text-xs font-medium sm:text-sm ${STATUS_TEXT[s]}`}>
                <Icon size={16} className={`shrink-0 ${STATUS_ICON_COLOR[s]}`} aria-hidden="true" />
                {statusLabel[s]}
              </span>
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="tnum text-2xl font-semibold text-ink sm:text-[32px] sm:leading-10" data-count={n}>{fmt(n)}</span>
                <span className="tnum text-sm text-muted">{pct(n, result.counts.total)}</span>
              </span>
              <span className={`hidden text-xs sm:inline ${on ? STATUS_TEXT[s] : 'text-muted'}`}>{on ? 'Showing only these · click to show all' : 'Show only these'}</span>
            </button>
          )
        })}
      </div>
      <div className="flex h-1.5" aria-hidden="true">
        {STATUSES.map((s) => (
          <span key={s} className={BAR[s]} style={{ width: pct(countOf(result, s), result.counts.total) }} />
        ))}
      </div>
    </div>
  )
}

export function RuleImpact({ table, result, rules }: { table: Table; result: CheckResult; rules: Rule[] }) {
  const items = [
    ...rules.map((rule, k) => ({ key: rule.id, label: describeRule(rule, table.headers) ?? rule.column, mono: true, failed: result.impact[k]!.failed, review: result.impact[k]!.review })),
    { key: 'ids', label: 'Repeated IDs', mono: false, failed: null, review: result.duplicateIdRows },
    { key: 'dups', label: 'Possible duplicate students', mono: false, failed: null, review: result.likelyDuplicateRows },
  ]
  return (
    <section aria-labelledby="impact-title" className="overflow-hidden rounded-md border border-line bg-surface">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line bg-bg/60 px-4 py-3 sm:px-5">
        <h2 id="impact-title" className="text-base font-semibold">What each check did</h2>
        <p className="text-xs text-muted">A student can be counted by more than one check.</p>
      </header>
      <ul className="grid divide-line sm:grid-cols-2 sm:divide-x lg:grid-cols-4">
        {items.map((it) => (
          <li key={it.key} className="border-b border-line px-5 py-3 last:border-b-0 sm:border-b-0">
            <p className={`truncate text-xs ${it.mono ? 'font-mono' : ''}`} title={it.label}>{it.label}</p>
            <p className="tnum mt-1 flex flex-wrap gap-x-3 text-sm">
              {it.failed !== null && (
                <span><b className="font-semibold text-no">{fmt(it.failed)}</b> <span className="text-muted">not eligible</span></span>
              )}
              <span><b className="font-semibold text-review">{fmt(it.review)}</b> <span className="text-muted">to review</span></span>
            </p>
          </li>
        ))}
      </ul>
    </section>
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

/**
 * True only while the browser prints. The paper report lists every shown row, so it is
 * rendered just for printing (Print button or Ctrl+P) instead of sitting hidden in the page.
 */
function usePrinting() {
  const [printing, setPrinting] = useState(false)
  useEffect(() => {
    const before = () => flushSync(() => setPrinting(true))
    const after = () => setPrinting(false)
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [])
  return printing
}

/** The usual spreadsheet formula next to Rollcheck: what it would decide, and where it is wrong. */
function FormulaPanel({ total, differ, passed, failed, text, onlyDiffer, onOnlyDiffer, onClose }: {
  total: number
  differ: number
  passed: number
  failed: number
  text: string
  onlyDiffer: boolean
  onOnlyDiffer: (v: boolean) => void
  onClose: () => void
}) {
  return (
    <section aria-labelledby="formula-title" className="overflow-hidden rounded-md border border-no/40 bg-surface">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line bg-no-soft px-4 py-3 sm:px-5">
        <FileSpreadsheet size={16} className="text-no" aria-hidden="true" />
        <h2 id="formula-title" className="text-base font-semibold">Compared with an Excel formula</h2>
        <button type="button" className="btn btn-quiet ml-auto px-2 py-1 text-xs" onClick={onClose}>
          <X size={14} aria-hidden="true" /> Hide comparison
        </button>
      </header>
      <div className="grid gap-4 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="space-y-2 text-sm">
          <p className="text-xs text-muted">The formula an office would usually type for these rules:</p>
          <p className="overflow-x-auto rounded-sm border border-line bg-bg px-3 py-2 font-mono text-xs whitespace-nowrap">{text}</p>
          <p className="text-xs text-muted">
            A formula always answers. In Excel, text counts as larger than any number and an empty cell as 0, so “AB”, “9,8” or a blank get a firm answer nobody checked.
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-sm">
            <b className="tnum text-[28px] leading-8 font-semibold text-no">{fmt(differ)}</b>
            <span className="text-muted"> of {fmt(total)} students get a different answer.</span>
          </p>
          <ul className="space-y-1 text-xs">
            <li><b className="tnum font-semibold text-ink">{fmt(passed)}</b> <span className="text-muted">marked Eligible by the formula, held back by Rollcheck</span></li>
            <li><b className="tnum font-semibold text-ink">{fmt(failed)}</b> <span className="text-muted">marked Not eligible by the formula, not a clear failure to Rollcheck</span></li>
          </ul>
          <button type="button" aria-pressed={onlyDiffer} className={`btn px-3 py-1.5 text-xs ${onlyDiffer ? 'border-no bg-no-soft text-no' : ''}`} onClick={() => onOnlyDiffer(!onlyDiffer)} disabled={differ === 0}>
            {onlyDiffer ? 'Showing only these · show all' : `Show only these ${fmt(differ)}`}
          </button>
        </div>
      </div>
    </section>
  )
}

export function ResultsStage(p: Props) {
  const { table, result, rules, filter } = p
  const printing = usePrinting()
  const [comparing, setComparing] = useState(false)
  const [onlyDiffer, setOnlyDiffer] = useState(false)
  const comparison = useMemo(() => (comparing ? compareWithFormula(table, rules, result) : null), [comparing, table, rules, result])
  const differSet = useMemo(() => new Set(comparison?.differ ?? []), [comparison])
  const searchBox = useRef<HTMLInputElement>(null)
  // Press "/" anywhere on the results to jump to search, as in most office tools.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (e.key === '/' && !(t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) {
        e.preventDefault()
        searchBox.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
  const query = useDeferredValue(p.search.trim().toLowerCase())
  const haystack = useMemo(() => table.rows.map((cells) => cells.map((c) => c.raw).join('\u0001').toLowerCase()), [table])
  const shown = useMemo(
    () =>
      result.order.filter(
        (i) => (!filter || result.rows[i]!.status === filter) && (!query || haystack[i]!.includes(query)) && (!onlyDiffer || differSet.has(i)),
      ),
    [result, filter, query, haystack, onlyDiffer, differSet],
  )
  const columns = [...new Set([p.idColumn, p.nameColumn, ...rules.map((r) => r.column)].filter(Boolean))]

  return (
    <>
    {printing && <PrintReport table={table} result={result} checked={p.checked} rows={shown} filter={filter} search={p.search} />}
    <div className="space-y-5 print:hidden">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <CheckedLine result={result} fileName={table.fileName} />
          <div className="mt-2 flex flex-wrap gap-1">
            <button type="button" className="btn btn-quiet -ml-2 px-2 py-1 text-xs" onClick={p.onChangeRules}>
              <SlidersHorizontal size={14} aria-hidden="true" />
              {copy.changeRules}
            </button>
            <button type="button" className="btn btn-quiet px-2 py-1 text-xs" onClick={p.onStartOver}>
              <RotateCcw size={14} aria-hidden="true" />
              {copy.startOver}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">{p.actions}</div>
      </div>

      <Counters result={result} filter={filter} onFilter={p.onFilter} />

      <RuleImpact table={table} result={result} rules={rules} />

      {comparison && (
        <FormulaPanel
          total={result.counts.total}
          differ={comparison.differ.length}
          passed={comparison.passedUnchecked}
          failed={comparison.failedUnchecked}
          text={formulaText(rules)}
          onlyDiffer={onlyDiffer}
          onOnlyDiffer={setOnlyDiffer}
          onClose={() => {
            setComparing(false)
            setOnlyDiffer(false)
          }}
        />
      )}

      <section aria-labelledby="students-title" className="min-w-0 overflow-hidden rounded-md border border-line bg-surface">
        <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-bg/60 px-4 py-3 sm:px-5">
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
          {!comparing && (
            <button type="button" className="btn px-2.5 py-1 text-xs" onClick={() => setComparing(true)}>
              <FileSpreadsheet size={14} aria-hidden="true" />
              Compare with an Excel formula
            </button>
          )}
          <div className="relative w-full sm:ml-auto sm:w-80">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" />
            <label htmlFor="search" className="sr-only">Search students</label>
            <input
              ref={searchBox}
              id="search"
              type="text"
              className="field w-full pr-16 pl-9"
              placeholder="Search ID, name or any value"
              value={p.search}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => p.onSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && p.search && (e.stopPropagation(), p.onSearch(''))}
            />
            {p.search ? (
              <button
                type="button"
                className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-sm p-1 text-muted hover:bg-bg hover:text-ink"
                aria-label="Clear search"
                onClick={() => {
                  p.onSearch('')
                  searchBox.current?.focus()
                }}
              >
                <X size={16} aria-hidden="true" />
              </button>
            ) : (
              <span className="kbd pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 sm:inline" aria-hidden="true">/</span>
            )}
          </div>
          <p className="w-full text-xs text-muted">Needs review first, then Not eligible, then Eligible. Click a row to see every cell and reason.</p>
        </header>

        {shown.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted">
            {query ? (
              <>
                No students match &lsquo;{p.search.trim()}&rsquo;.{' '}
                <button type="button" className="text-accent underline underline-offset-2" onClick={() => p.onSearch('')}>
                  Show all students
                </button>
              </>
            ) : (
              EMPTY[filter ?? 'review']
            )}
          </div>
        ) : (
          <ResultsTable
            table={table}
            result={result}
            rows={shown}
            columns={columns}
            nameColumn={p.nameColumn}
            selected={p.selectedRow}
            onOpen={(i) => p.onOpenRow(i)}
            formula={comparison?.verdicts ?? null}
          />
        )}
      </section>

      {p.selectedRow !== null && <RowDetail table={table} result={result} rules={rules} index={p.selectedRow} onClose={() => p.onOpenRow(null)} />}
    </div>
    </>
  )
}
