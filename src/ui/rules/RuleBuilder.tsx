import { ArrowDown, ArrowUp, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { useMemo } from 'react'
import { columnStats, isMostlyNonNumeric, isNumberRule, MAX_RULES, ruleProblem, type Condition, type Rule, type Table } from '../../engine/core'
import { conditionLabel, copy } from '../copy'

let seq = 0
export const newRule = (column = ''): Rule => ({ id: `rule-${Date.now().toString(36)}-${++seq}`, column, condition: 'atLeast', value: '', margin: 1 })

const CONDITIONS = Object.keys(conditionLabel) as Condition[]

interface Props {
  table: Table
  rules: Rule[]
  showProblems: boolean
  missingColumns: string[]
  onChange: (rules: Rule[]) => void
}

export function RuleBuilder({ table, rules, showProblems, missingColumns, onChange }: Props) {
  const update = (i: number, patch: Partial<Rule>) => onChange(rules.map((r, k) => (k === i ? { ...r, ...patch } : r)))
  const move = (i: number, by: -1 | 1) => {
    const next = [...rules]
    const [r] = next.splice(i, 1)
    next.splice(i + by, 0, r!)
    onChange(next)
  }
  const mostlyText = useMemo(() => {
    const out = new Set<string>()
    for (const h of table.headers) if (isMostlyNonNumeric(columnStats(table, h))) out.add(h)
    return out
  }, [table])

  return (
    <div className="space-y-3">
      {rules.length === 0 && <p className="rounded-md border border-dashed border-line-strong px-4 py-3 text-sm text-muted">{copy.needRule}</p>}

      <ol className="space-y-3" aria-label="Rules">
        {rules.map((rule, i) => {
          const problem = ruleProblem(rule, table.headers)
          const invalid = showProblems && problem !== null
          const missing = missingColumns.includes(rule.column)
          const numberRule = isNumberRule(rule.condition)
          const warn = numberRule && rule.column && mostlyText.has(rule.column)
          const id = `rule-${i + 1}`
          return (
            <li key={rule.id}>
              {i > 0 && (
                <div className="mb-3 flex items-center gap-3" aria-hidden="true">
                  <span className="h-px flex-1 bg-line" />
                  <span className="font-mono text-[11px] tracking-wider text-muted uppercase">and</span>
                  <span className="h-px flex-1 bg-line" />
                </div>
              )}
              <div className={`rounded-md border ${invalid || missing ? 'border-no/50' : 'border-line'}`}>
                <div className="flex items-center gap-2 border-b border-line px-3 py-1.5">
                  <span className="tnum font-mono text-xs font-medium text-muted">Rule {i + 1}</span>
                  <div className="ml-auto flex">
                    <button type="button" className="btn btn-quiet px-1.5 py-1" aria-label={`Move rule ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp size={16} aria-hidden="true" />
                    </button>
                    <button type="button" className="btn btn-quiet px-1.5 py-1" aria-label={`Move rule ${i + 1} down`} disabled={i === rules.length - 1} onClick={() => move(i, 1)}>
                      <ArrowDown size={16} aria-hidden="true" />
                    </button>
                    <button type="button" className="btn btn-quiet px-1.5 py-1 hover:text-no" aria-label={`Remove rule ${i + 1}`} onClick={() => onChange(rules.filter((_, k) => k !== i))}>
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="flex min-w-0 flex-col gap-1">
                    <label htmlFor={`${id}-col`} className="label">Column</label>
                    <select
                      id={`${id}-col`}
                      className="field w-full min-w-0 truncate"
                      value={table.headers.includes(rule.column) ? rule.column : ''}
                      aria-invalid={invalid && !table.headers.includes(rule.column)}
                      onChange={(e) => update(i, { column: e.target.value })}
                    >
                      <option value="">{missing ? `"${rule.column}" is not in this file` : 'Choose a column…'}</option>
                      {table.headers.map((h) => (
                        <option key={h} value={h}>{h.length > 60 ? `${h.slice(0, 57)}…` : h}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <label htmlFor={`${id}-cond`} className="label">Condition</label>
                    <select id={`${id}-cond`} className="field w-full min-w-0" value={rule.condition} onChange={(e) => update(i, { condition: e.target.value as Condition })}>
                      {CONDITIONS.map((c) => (
                        <option key={c} value={c}>{conditionLabel[c]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    {rule.condition === 'notBlank' ? (
                      <>
                        <span className="label" aria-hidden="true">&nbsp;</span>
                        <p className="py-1.5 text-xs text-muted">No value needed.</p>
                      </>
                    ) : (
                      <>
                        <label htmlFor={`${id}-val`} className="label">{numberRule ? 'Limit' : rule.condition === 'oneOf' ? 'Values' : 'Value'}</label>
                        {rule.condition === 'oneOf' ? (
                          <textarea
                            id={`${id}-val`}
                            rows={2}
                            className="field w-full font-mono"
                            value={rule.value}
                            aria-invalid={invalid}
                            aria-describedby={`${id}-hint`}
                            onChange={(e) => update(i, { value: e.target.value })}
                          />
                        ) : (
                          <input
                            id={`${id}-val`}
                            className="field w-full font-mono"
                            inputMode={numberRule ? 'decimal' : undefined}
                            placeholder={numberRule ? 'e.g. 75' : 'e.g. Cleared'}
                            value={rule.value}
                            aria-invalid={invalid}
                            onChange={(e) => update(i, { value: e.target.value })}
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>

                {(numberRule || rule.condition === 'oneOf' || warn || invalid) && (
                  <div className="space-y-2 border-t border-line bg-bg/50 px-3 py-2 text-xs">
                    {numberRule && (
                      <div className="flex flex-wrap items-center gap-2 text-muted">
                        <label htmlFor={`${id}-margin`}>Treat values within</label>
                        <input
                          id={`${id}-margin`}
                          className="field tnum w-16 py-0.5 text-center font-mono text-xs"
                          inputMode="decimal"
                          value={Number.isNaN(rule.margin) ? '' : String(rule.margin)}
                          onChange={(e) => update(i, { margin: e.target.value.trim() === '' ? Number.NaN : Number(e.target.value) })}
                          aria-describedby={`${id}-margin-after`}
                        />
                        <span id={`${id}-margin-after`}>of the limit as Needs review</span>
                      </div>
                    )}
                    {rule.condition === 'oneOf' && <p id={`${id}-hint`} className="text-muted">One value per line, or separated by ;</p>}
                    {warn && (
                      <p className="flex items-start gap-1.5 text-review">
                        <TriangleAlert size={14} className="mt-0.5 shrink-0 text-review-mark" aria-hidden="true" />
                        Most values in {rule.column} are not numbers. Results for this rule will mostly be Needs review.
                      </p>
                    )}
                    {invalid && <p className="font-medium text-no">{problem}</p>}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <div className="flex items-center gap-3 pt-1">
        <button type="button" className="btn" disabled={rules.length >= MAX_RULES} onClick={() => onChange([...rules, newRule()])}>
          <Plus size={16} aria-hidden="true" />
          {copy.addRule}
        </button>
        <span className="tnum text-xs text-muted">{rules.length >= MAX_RULES ? copy.maxRules : `${rules.length} of ${MAX_RULES} rules`}</span>
      </div>
    </div>
  )
}
