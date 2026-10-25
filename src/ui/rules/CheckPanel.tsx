import { ArrowRight, TriangleAlert } from 'lucide-react'
import { isNumberRule, splitOptions, type Rule, type Table } from '../../engine'
import { conditionLabel, copy, fmt } from '../copy'
import { BusyLine } from '../shell/Shell'

/** A rule in plain words, or null while it is still incomplete. */
export function describeRule(rule: Rule, headers: string[]): string | null {
  if (!rule.column || !headers.includes(rule.column)) return null
  const cond = conditionLabel[rule.condition]
  if (rule.condition === 'notBlank') return `${rule.column} ${cond}`
  if (rule.condition === 'oneOf') {
    const opts = splitOptions(rule.value)
    return opts.length ? `${rule.column} ${cond} ${opts.join(', ')}` : null
  }
  return rule.value.trim() ? `${rule.column} ${cond} ${rule.value.trim()}` : null
}

interface Props {
  table: Table
  rules: Rule[]
  idColumn: string
  nameColumn: string
  matchColumns: string[]
  busy: { label: string; detail?: string | undefined } | null
  problem: string | null
  onCheck: () => void
  onStartOver: () => void
}

/** The live, plain-English summary of what "Check students" will do. */
export function CheckPanel({ table, rules, idColumn, nameColumn, matchColumns, busy, problem, onCheck, onStartOver }: Props) {
  const lines = rules.map((r) => describeRule(r, table.headers))
  const margins = [...new Set(rules.filter((r) => isNumberRule(r.condition) && r.margin > 0).map((r) => r.margin))]
  return (
    <div className="rounded-md border border-line bg-surface">
      <p className="eyebrow border-b border-line px-4 py-2.5">Your check</p>
      <div className="space-y-4 px-4 py-4 text-sm">
        <div>
          <p className="font-medium">A student is Eligible when</p>
          {rules.length === 0 ? (
            <p className="mt-1 text-muted">Add a rule to start.</p>
          ) : (
            <ol className="mt-2 space-y-1.5">
              {lines.map((l, i) => (
                <li key={rules[i]!.id} className="flex gap-2">
                  <span className="tnum w-10 shrink-0 font-mono text-xs leading-5 text-muted">{i === 0 ? '' : 'and'}</span>
                  {l ? <span className="font-mono text-xs leading-5">{l}</span> : <span className="text-xs leading-5 text-muted italic">Rule {i + 1} is not finished</span>}
                </li>
              ))}
            </ol>
          )}
        </div>
        <ul className="space-y-1.5 border-t border-line pt-3 text-xs text-muted">
          {margins.length > 0 && <li>Values within {margins.join(' or ')} of a limit go to Needs review.</li>}
          <li>Text, blanks and comma decimals in number rules go to Needs review.</li>
          {idColumn && <li>Repeated {idColumn} values go to Needs review.</li>}
          {nameColumn && matchColumns.length > 0 && <li>Same name and same {matchColumns.join(' and ')} go to Needs review.</li>}
        </ul>
        <div className="space-y-2 border-t border-line pt-3">
          <button type="button" className="btn btn-primary w-full py-2" onClick={onCheck} disabled={busy !== null || rules.length === 0}>
            {copy.checkStudents}
            <span className="tnum font-normal opacity-80">· {fmt(table.rows.length)}</span>
            <ArrowRight size={16} aria-hidden="true" />
          </button>
          {busy && <BusyLine label={busy.label} detail={busy.detail} />}
          {problem && (
            <p role="alert" className="flex items-start gap-1.5 text-xs font-medium text-no">
              <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              {problem}
            </p>
          )}
        </div>
        <button type="button" className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline" onClick={onStartOver}>
          {copy.startOver}: choose another file
        </button>
      </div>
    </div>
  )
}
