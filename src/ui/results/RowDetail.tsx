import { CircleCheck, CircleX, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { Decision } from '../../io/decisions'
import type { CheckResult, OutcomeResult, Rule, Table } from '../../engine/core'
import { describeRule } from '../rules/CheckPanel'
import { StatusBadge } from './Status'

const OUTCOME: Record<OutcomeResult, { label: string; cls: string }> = {
  pass: { label: 'Passed', cls: 'text-ok' },
  fail: { label: 'Failed', cls: 'text-no' },
  review: { label: 'Needs review', cls: 'text-review' },
}

interface Props {
  table: Table
  result: CheckResult
  rules: Rule[]
  index: number
  onClose: () => void
  decision?: Decision | undefined
  onDecide?: (d: Decision | null) => void
}

/** For a Needs review row: the person decides, with an optional note. */
function DecisionBox({ decision, onDecide }: { decision: Decision | undefined; onDecide: (d: Decision | null) => void }) {
  const note = decision?.note ?? ''
  const pick = (status: Decision['status']) => onDecide({ status, note })
  const opt = (status: Decision['status'], label: string, Icon: typeof CircleCheck, on: string) => (
    <button
      type="button"
      aria-pressed={decision?.status === status}
      onClick={() => pick(status)}
      className={`btn flex-1 justify-center py-2 ${decision?.status === status ? on : ''}`}
    >
      <Icon size={16} aria-hidden="true" />
      {label}
    </button>
  )
  return (
    <section aria-labelledby="decide-title" className="rounded-md border border-review-mark/50 bg-review-soft/60 p-3">
      <h3 id="decide-title" className="text-sm font-semibold">Your decision</h3>
      <p className="mt-0.5 text-xs text-muted">Rollcheck will not guess. After checking the student's record, record what you decided.</p>
      <div className="mt-3 flex gap-2">
        {opt('eligible', 'Eligible', CircleCheck, 'border-ok bg-ok-soft text-ok')}
        {opt('not-eligible', 'Not eligible', CircleX, 'border-no bg-no-soft text-no')}
      </div>
      <label htmlFor="decision-note" className="label mt-3 block">Note (optional)</label>
      <textarea
        id="decision-note"
        rows={2}
        className="field mt-1 w-full"
        placeholder="e.g. Checked the paper register: 75.2%"
        value={note}
        disabled={!decision}
        onChange={(e) => decision && onDecide({ ...decision, note: e.target.value })}
      />
      {decision ? (
        <button type="button" className="mt-2 text-xs text-muted underline underline-offset-2 hover:text-ink" onClick={() => onDecide(null)}>
          Clear decision
        </button>
      ) : (
        <p className="mt-2 text-xs text-muted">Choose a decision to add a note.</p>
      )}
    </section>
  )
}

/** Everything about one student: every original cell, each rule's outcome, every reason. */
export function RowDetail({ table, result, rules, index, onClose, decision, onDecide }: Props) {
  const panel = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })
  const row = result.rows[index]!
  const cells = table.rows[index]!

  useEffect(() => {
    const returnTo = document.getElementById(`student-row-${index}`) ?? (document.activeElement as HTMLElement | null)
    panel.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close.current()
      }
      if (e.key === 'Tab' && panel.current) {
        // Keep focus inside the panel while it is open.
        const items = panel.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        const first = items[0]
        const last = items[items.length - 1]
        if (!first || !last) return
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      returnTo?.focus?.()
    }
  }, [index])

  return (
    <div className="fixed inset-0 z-40 print:hidden">
      <div className="absolute inset-0 bg-ink/20" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col border-l border-line bg-surface shadow-panel outline-none"
      >
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Row {table.rowNumbers[index]}</p>
            <h2 id="detail-title" className="mt-1 text-lg font-semibold">
              <StatusBadge status={row.status} />
            </h2>
          </div>
          <button type="button" className="btn btn-quiet px-2" onClick={onClose} aria-label="Close details">
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {row.status === 'review' && onDecide && <DecisionBox decision={decision} onDecide={onDecide} />}

          <section>
            <h3 className="label mb-2">Reason</h3>
            <ul className="space-y-1.5 text-sm">
              {row.reasons.map((r) => (
                <li key={r} className="border-l-2 border-line-strong pl-3">{r}</li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="label mb-2">Each rule</h3>
            <ol className="divide-y divide-line rounded-md border border-line">
              {rules.map((rule, k) => {
                const o = row.outcomes[k]!
                const cell = cells[table.headers.indexOf(rule.column)]!
                return (
                  <li key={rule.id} className="space-y-1 px-3 py-2.5 text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-mono text-xs">{describeRule(rule, table.headers)}</span>
                      <span className={`shrink-0 text-xs font-medium ${OUTCOME[o.result].cls}`}>{OUTCOME[o.result].label}</span>
                    </div>
                    <p className="text-xs text-muted">
                      Value in file: <span className="font-mono whitespace-pre text-ink">{cell.kind === 'blank' ? '(blank)' : `"${cell.raw}"`}</span>
                    </p>
                  </li>
                )
              })}
            </ol>
          </section>

          <section>
            <h3 className="label mb-2">All {table.headers.length} cells, exactly as in the file</h3>
            <dl className="divide-y divide-line rounded-md border border-line text-xs">
              {table.headers.map((h, c) => {
                const cell = cells[c]!
                return (
                  <div key={h} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 px-3 py-1.5">
                    <dt className="truncate text-muted" title={h}>{h}</dt>
                    <dd className="font-mono break-words whitespace-pre-wrap">
                      {cell.kind === 'blank' ? <span className="text-muted italic">blank</span> : cell.raw}
                      {cell.shown !== undefined && <span className="ml-2 font-sans text-muted">Excel shows {cell.shown}</span>}
                      {cell.kind === 'number' && cell.raw.endsWith('%') && cell.value !== null && (
                        <span className="ml-2 font-sans text-muted">stored as {Number((cell.value / 100).toPrecision(15))}</span>
                      )}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </section>
        </div>
      </div>
    </div>
  )
}
