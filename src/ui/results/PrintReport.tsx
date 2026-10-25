import type { CheckResult, Status, Table } from '../../engine/core'
import { localTime, type CheckedWith } from '../../io/time'
import { describeRule } from '../rules/CheckPanel'
import { fmt, statusLabel } from '../copy'

interface Props {
  table: Table
  result: CheckResult
  checked: CheckedWith
  rows: number[]
  filter: Status | null
  search: string
}

/** Only shown when printing: a plain, complete paper record of the check. */
export function PrintReport({ table, result, checked, rows, filter, search }: Props) {
  const columns = [...new Set([checked.idColumn, checked.nameColumn, ...checked.rules.map((r) => r.column)].filter(Boolean))]
  const idx = columns.map((c) => table.headers.indexOf(c))
  const { counts } = result
  return (
    <div className="hidden text-[11px] leading-snug text-black print:block">
      <h1 className="text-[16px] font-semibold">Rollcheck results — {table.fileName}{table.sheetName ? ` (${table.sheetName})` : ''}</h1>
      <p className="mt-0.5">Checked {localTime(checked.at)}. {fmt(counts.total)} of {fmt(counts.total)} students checked.</p>
      <p className="mt-2 font-semibold">A student is Eligible when</p>
      <ol className="list-decimal pl-5">
        {checked.rules.map((r) => (
          <li key={r.id}>
            {describeRule(r, table.headers)}
            {(r.condition === 'atLeast' || r.condition === 'atMost') && r.margin > 0 && ` (values within ${r.margin} of the limit: Needs review)`}
          </li>
        ))}
      </ol>
      <p className="mt-2">
        Eligible {fmt(counts.eligible)} · Not eligible {fmt(counts.notEligible)} · Needs review {fmt(counts.review)} · Total {fmt(counts.total)}
      </p>
      {(filter || search.trim()) && (
        <p className="mt-1 italic">
          This printout lists {fmt(rows.length)} students: {filter ? `${statusLabel[filter]} only` : 'all groups'}
          {search.trim() ? `, matching "${search.trim()}"` : ''}.
        </p>
      )}
      <table className="mt-3 w-full border-collapse">
        <thead>
          <tr>
            <th className="border border-black px-1 py-0.5 text-left">Row</th>
            {columns.map((c) => (
              <th key={c} className="border border-black px-1 py-0.5 text-left">{c}</th>
            ))}
            <th className="border border-black px-1 py-0.5 text-left">Status</th>
            <th className="border border-black px-1 py-0.5 text-left">Reason</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => (
            <tr key={i} className="break-inside-avoid">
              <td className="border border-black px-1 py-0.5">{table.rowNumbers[i]}</td>
              {idx.map((c, k) => (
                <td key={k} className="border border-black px-1 py-0.5 font-mono whitespace-pre">{table.rows[i]![c]!.raw}</td>
              ))}
              <td className="border border-black px-1 py-0.5">{statusLabel[result.rows[i]!.status]}</td>
              <td className="border border-black px-1 py-0.5">{result.rows[i]!.reasons.join(' ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
