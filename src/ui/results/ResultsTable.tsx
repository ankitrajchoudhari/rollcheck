import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, useSyncExternalStore } from 'react'
import { Equal, EqualNot } from 'lucide-react'
import type { CheckResult, FormulaVerdict, Table } from '../../engine/core'
import type { Decisions } from '../../io/decisions'
import { statusLabel } from '../copy'
import { StatusBadge } from './Status'

interface Props {
  table: Table
  result: CheckResult
  /** Row indices to show, in display order. */
  rows: number[]
  columns: string[]
  /** The name column gets more room. */
  nameColumn?: string
  selected: number | null
  onOpen: (index: number) => void
  /** When comparing: what the usual spreadsheet formula would decide for each row. */
  formula?: FormulaVerdict[] | null
  decisions?: Decisions
}

/** "Decided: Eligible" under a Needs review status. */
export function DecidedTag({ status }: { status: 'eligible' | 'not-eligible' }) {
  return (
    <span className={`mt-1 inline-block rounded-sm border px-1.5 text-[11px] font-medium whitespace-nowrap ${status === 'eligible' ? 'border-ok/40 bg-ok-soft text-ok' : 'border-no/40 bg-no-soft text-no'}`}>
      Decided: {statusLabel[status]}
    </span>
  )
}

/** The formula's answer, marked when it disagrees with Rollcheck. */
export function FormulaCell({ verdict, agrees }: { verdict: FormulaVerdict; agrees: boolean }) {
  const Icon = agrees ? Equal : EqualNot
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs whitespace-nowrap ${agrees ? 'text-muted' : 'rounded-sm bg-no-soft px-1.5 py-0.5 font-medium text-no'}`}>
      <Icon size={14} aria-hidden="true" />
      {statusLabel[verdict]}
      <span className="sr-only">{agrees ? '(same as Rollcheck)' : '(differs from Rollcheck)'}</span>
    </span>
  )
}

const NARROW = '(max-width: 639px)'
/** True on phone-width screens, where each student is shown as a stacked entry instead of a wide row. */
function useNarrow() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia?.(NARROW)
      m?.addEventListener('change', cb)
      return () => m?.removeEventListener('change', cb)
    },
    () => window.matchMedia?.(NARROW).matches ?? false,
    () => false,
  )
}

/** Small results render in full; large ones render only the rows on screen, so 50,000 students scroll smoothly. */
const FULL_RENDER_LIMIT = 200
/** A register's margin mark: a thin coloured rule beside each row, always next to the text label. */
const MARK = { eligible: 'border-l-ok', 'not-eligible': 'border-l-no', review: 'border-l-review-mark' } as const

export function ResultsTable({ table, result, rows, columns, nameColumn, selected, onOpen, formula, decisions = {} }: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  const narrow = useNarrow()
  const colIdx = columns.map((c) => table.headers.indexOf(c))
  const widths = columns.map((c) => (c === nameColumn ? 'minmax(140px, 200px)' : 'minmax(72px, 120px)'))
  const template = `56px ${widths.join(' ')}${formula ? ' 140px' : ''} 168px minmax(320px, 1fr)`
  const minWidth = 56 + columns.reduce((w, c) => w + (c === nameColumn ? 140 : 80), 0) + (formula ? 140 : 0) + 168 + 340

  // This component is not memoized, so the virtualizer's changing functions are safe here.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtual = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => 44,
    initialRect: { width: 1000, height: 640 },
    overscan: 12,
  })

  const full = rows.length <= FULL_RENDER_LIMIT
  const items = full
    ? rows.map((_, index) => ({ index, start: 0, key: index }))
    : virtual.getVirtualItems()

  return (
    <div
      ref={scroller}
      className="relative max-h-[70vh] overflow-auto bg-surface print:hidden"
      role="table"
      aria-label="Students"
      aria-rowcount={rows.length + 1}
    >
      <div style={narrow ? undefined : { minWidth }}>
        <div role="rowgroup" className={`sticky top-0 z-10 border-b border-line bg-surface ${narrow ? 'sr-only' : ''}`}>
          <div role="row" className="grid border-l-[3px] border-l-transparent" style={{ gridTemplateColumns: template }} aria-rowindex={1}>
            <span role="columnheader" className="th">Row</span>
            {columns.map((c) => (
              <span key={c} role="columnheader" className="th truncate" title={c}>{c}</span>
            ))}
            {formula && <span role="columnheader" className="th text-no">Excel formula</span>}
            <span role="columnheader" className="th">Status</span>
            <span role="columnheader" className="th">Reason</span>
          </div>
        </div>
        <div role="rowgroup" style={full ? undefined : { height: virtual.getTotalSize(), position: 'relative' }}>
          {items.map((v) => {
            const i = rows[v.index]!
            const row = result.rows[i]!
            const cells = table.rows[i]!
            return (
              <div
                key={i}
                id={`student-row-${i}`}
                ref={full ? undefined : virtual.measureElement}
                data-index={v.index}
                role="row"
                aria-rowindex={v.index + 2}
                tabIndex={0}
                aria-label={`Row ${table.rowNumbers[i]}, open details`}
                onClick={() => onOpen(i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onOpen(i)
                  }
                }}
                className={`${full ? '' : 'absolute left-0'} grid w-full cursor-pointer border-b border-l-[3px] border-b-line text-sm transition-colors hover:bg-bg focus-visible:-outline-offset-2 ${MARK[row.status]} ${
                  selected === i ? 'bg-accent-soft' : ''
                }`}
                style={{ ...(narrow ? {} : { gridTemplateColumns: template }), ...(full ? {} : { transform: `translateY(${v.start}px)` }) }}
              >
                {narrow ? (
                  <span role="cell" className="col-span-full flex flex-col gap-1 px-3 py-3">
                    <span className="flex items-baseline gap-2 text-xs">
                      <span className="tnum font-mono text-muted">Row {table.rowNumbers[i]}</span>
                      {colIdx.map((c, k) => (
                        <span key={k} className={`truncate whitespace-pre ${columns[k] === nameColumn ? 'text-sm font-medium' : 'font-mono'}`}>
                          {k < 2 ? (cells[c]!.kind === 'blank' ? '—' : cells[c]!.raw) : null}
                        </span>
                      ))}
                    </span>
                    <span>
                      <StatusBadge status={row.status} />
                      {decisions[i] && <> <DecidedTag status={decisions[i].status} /></>}
                    </span>
                    {formula && (
                      <span className="flex items-center gap-2 text-xs text-muted">
                        Excel formula: <FormulaCell verdict={formula[i]!} agrees={formula[i] === row.status} />
                      </span>
                    )}
                    <span className="text-sm leading-5">{row.reasons.join(' ')}</span>
                  </span>
                ) : (
                  <>
                <span role="cell" className="tnum px-3 py-2.5 font-mono text-xs text-muted">{table.rowNumbers[i]}</span>
                {colIdx.map((c, k) => (
                  <span key={k} role="cell" className={`truncate px-3 py-2.5 whitespace-pre ${columns[k] === nameColumn ? 'text-sm' : 'font-mono text-xs'}`} title={cells[c]!.raw}>
                    {cells[c]!.kind === 'blank' ? <span className="text-muted italic">blank</span> : cells[c]!.raw}
                  </span>
                ))}
                {formula && (
                  <span role="cell" className="px-3 py-2.5">
                    <FormulaCell verdict={formula[i]!} agrees={formula[i] === row.status} />
                  </span>
                )}
                <span role="cell" className="px-3 py-2.5">
                  <StatusBadge status={row.status} />
                  {decisions[i] && <span className="block"><DecidedTag status={decisions[i].status} /></span>}
                </span>
                <span role="cell" className="px-3 py-2.5 leading-5">{row.reasons.join(' ')}</span>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
