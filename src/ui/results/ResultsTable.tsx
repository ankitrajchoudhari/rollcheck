import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import type { CheckResult, Table } from '../../engine'
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
}

/** Small results render in full; large ones render only the rows on screen, so 50,000 students scroll smoothly. */
const FULL_RENDER_LIMIT = 200

export function ResultsTable({ table, result, rows, columns, nameColumn, selected, onOpen }: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  const colIdx = columns.map((c) => table.headers.indexOf(c))
  const widths = columns.map((c) => (c === nameColumn ? 'minmax(140px, 200px)' : 'minmax(72px, 120px)'))
  const template = `56px ${widths.join(' ')} 132px minmax(320px, 1fr)`
  const minWidth = 56 + columns.reduce((w, c) => w + (c === nameColumn ? 140 : 80), 0) + 132 + 340

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
      className="relative max-h-[70vh] overflow-auto rounded-md border border-line bg-surface print:hidden"
      role="table"
      aria-label="Students"
      aria-rowcount={rows.length + 1}
    >
      <div style={{ minWidth }}>
        <div role="rowgroup" className="sticky top-0 z-10 border-b border-line bg-bg">
          <div role="row" className="grid text-left text-xs text-muted" style={{ gridTemplateColumns: template }} aria-rowindex={1}>
            <span role="columnheader" className="px-3 py-2 font-medium">Row</span>
            {columns.map((c) => (
              <span key={c} role="columnheader" className="truncate px-3 py-2 font-medium" title={c}>{c}</span>
            ))}
            <span role="columnheader" className="px-3 py-2 font-medium">Status</span>
            <span role="columnheader" className="px-3 py-2 font-medium">Reason</span>
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
                className={`${full ? '' : 'absolute left-0'} grid w-full cursor-pointer border-b border-line text-sm transition-colors hover:bg-accent-soft/60 focus-visible:-outline-offset-2 ${
                  selected === i ? 'bg-accent-soft' : ''
                }`}
                style={{ gridTemplateColumns: template, ...(full ? {} : { transform: `translateY(${v.start}px)` }) }}
              >
                <span role="cell" className="tnum px-3 py-2.5 font-mono text-xs text-muted">{table.rowNumbers[i]}</span>
                {colIdx.map((c, k) => (
                  <span key={k} role="cell" className="truncate px-3 py-2.5 font-mono text-xs whitespace-pre" title={cells[c]!.raw}>
                    {cells[c]!.kind === 'blank' ? <span className="text-muted/60">blank</span> : cells[c]!.raw}
                  </span>
                ))}
                <span role="cell" className="px-3 py-2.5"><StatusBadge status={row.status} /></span>
                <span role="cell" className="px-3 py-2.5 leading-5">{row.reasons.join(' ')}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
