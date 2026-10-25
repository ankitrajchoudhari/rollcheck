import { ArrowDown, ArrowUp, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { useMemo } from 'react'
import { columnStats, isMostlyNonNumeric, isNumberRule, MAX_RULES, ruleProblem, type Condition, type Rule, type Table } from '../../engine'
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
    <fieldset className="space-y-3">
      <legend className="mb-2 flex w-full items-baseline justify-between gap-4">
        <span className="text-base font-semibold">Rules</span>
        <span className="text-xs text-muted">A student is eligible only when every rule is met.</span>
      </legend>

      {rules.length === 0 && <p className="rounded-md border border-dashed border-line-strong px-4 py-3 text-sm text-muted">{copy.needRule}</p>}

      <ol className="space-y-2">
        {rules.map((rule, i) => {
          const problem = ruleProblem(rule, table.headers)
          const invalid = showProblems && problem !== null
          const missing = missingColumns.includes(rule.column)
          const numberRule = isNumberRule(rule.condition)
          const warn = numberRule && rule.column && mostlyText.has(rule.column)
          const id = `rule-${i + 1}`
          return (
            <li key={rule.id}>
              {i > 0 && <p className="mb-2 pl-3 font-mono text-xs text-muted uppercase">and</p>}
              <div className={`rounded-md border bg-surface p-3 ${invalid || missing ? 'border-no/50' : 'border-line'}`}>
                <div className="flex flex-wrap items-end gap-2">
                  <span className="tnum w-14 pb-2 font-mono text-xs text-muted">Rule {i + 1}</span>
                  <div className="flex min-w-[160px] flex-1 flex-col gap-1">
                    <label htmlFor={`${id}-col`} className="label">Column</label>
                    <select
                      id={`${id}-col`}
                      className="field"
                      value={table.headers.includes(rule.column) ? rule.column : ''}
                      aria-invalid={invalid && !table.headers.includes(rule.column)}
                      onChange={(e) => update(i, { column: e.target.value })}
                    >
                      <option value="">{missing ? `"${rule.column}" not in this file — choose…` : 'Choose a column…'}</option>
                      {table.headers.map((h) => (
                        <option key={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex w-[150px] flex-col gap-1">
                    <label htmlFor={`${id}-cond`} className="label">Condition</label>
                    <select id={`${id}-cond`} className="field" value={rule.condition} onChange={(e) => update(i, { condition: e.target.value as Condition })}>
                      {CONDITIONS.map((c) => (
                        <option key={c} value={c}>{conditionLabel[c]}</option>
                      ))}
                    </select>
                  </div>
                  {rule.condition !== 'notBlank' && (
                    <div className="flex min-w-[140px] flex-1 flex-col gap-1">
                      <label htmlFor={`${id}-val`} className="label">{numberRule ? 'Limit' : rule.condition === 'oneOf' ? 'Values' : 'Value'}</label>
                      {rule.condition === 'oneOf' ? (
                        <textarea
                          id={`${id}-val`}
                          rows={2}
                          className="field font-mono"
                          value={rule.value}
                          aria-invalid={invalid}
                          aria-describedby={`${id}-hint`}
                          onChange={(e) => update(i, { value: e.target.value })}
                        />
                      ) : (
                        <input
                          id={`${id}-val`}
                          className="field font-mono"
                          inputMode={numberRule ? 'decimal' : undefined}
                          value={rule.value}
                          aria-invalid={invalid}
                          onChange={(e) => update(i, { value: e.target.value })}
                        />
                      )}
                    </div>
                  )}
                  <div className="ml-auto flex gap-1 pb-0.5">
                    <button type="button" className="btn btn-quiet px-2" aria-label={`Move rule ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp size={16} aria-hidden="true" />
                    </button>
                    <button type="button" className="btn btn-quiet px-2" aria-label={`Move rule ${i + 1} down`} disabled={i === rules.length - 1} onClick={() => move(i, 1)}>
                      <ArrowDown size={16} aria-hidden="true" />
                    </button>
                    <button type="button" className="btn btn-quiet px-2" aria-label={`Remove rule ${i + 1}`} onClick={() => onChange(rules.filter((_, k) => k !== i))}>
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {numberRule && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 pl-16 text-xs text-muted">
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
                {rule.condition === 'oneOf' && (
                  <p id={`${id}-hint`} className="mt-1 pl-16 text-xs text-muted">One value per line, or separated by ;</p>
                )}
                {warn && (
                  <p className="mt-2 flex items-start gap-1.5 pl-16 text-xs text-review">
                    <TriangleAlert size={14} className="mt-0.5 shrink-0 text-review-mark" aria-hidden="true" />
                    Most values in {rule.column} are not numbers. Results for this rule will mostly be Needs review.
                  </p>
                )}
                {invalid && <p className="mt-2 pl-16 text-xs text-no">{problem}</p>}
              </div>
            </li>
          )
        })}
      </ol>

      <div className="flex items-center gap-3">
        <button type="button" className="btn" disabled={rules.length >= MAX_RULES} onClick={() => onChange([...rules, newRule()])}>
          <Plus size={16} aria-hidden="true" />
          {copy.addRule}
        </button>
        <span className="text-xs text-muted">{rules.length >= MAX_RULES ? copy.maxRules : `${rules.length} of ${MAX_RULES}`}</span>
      </div>
    </fieldset>
  )
}
