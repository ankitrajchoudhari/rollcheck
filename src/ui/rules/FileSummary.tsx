import { X } from 'lucide-react'
import { useMemo } from 'react'
import { columnStats, columnType, type ColumnType, type Table } from '../../engine'
import { fmt } from '../copy'

export function useColumnTypes(table: Table): ColumnType[] {
  return useMemo(() => table.headers.map((h) => columnType(columnStats(table, h))), [table])
}

export function FileSummary({ table, sheets, onSheet, disabled }: { table: Table; sheets: string[]; onSheet: (s: string) => void; disabled: boolean }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <div className="bg-surface px-4 py-3">
        <dt className="label">File</dt>
        <dd className="mt-0.5 truncate font-mono text-sm" title={table.fileName}>{table.fileName}</dd>
      </div>
      <div className="bg-surface px-4 py-3">
        <dt className="label">
          <label htmlFor="sheet">Sheet</label>
        </dt>
        <dd className="mt-0.5">
          {sheets.length > 1 ? (
            <select id="sheet" className="field w-full min-w-0 py-0.5" value={table.sheetName} disabled={disabled} onChange={(e) => onSheet(e.target.value)}>
              {sheets.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          ) : (
            <span className="text-sm">{table.sheetName ?? '—'}</span>
          )}
        </dd>
      </div>
      <div className="bg-surface px-4 py-3">
        <dt className="label">Rows</dt>
        <dd className="tnum mt-0.5 text-sm font-medium">{fmt(table.rows.length)}</dd>
      </div>
      <div className="bg-surface px-4 py-3">
        <dt className="label">Columns</dt>
        <dd className="tnum mt-0.5 text-sm font-medium">{fmt(table.headers.length)}</dd>
      </div>
    </dl>
  )
}

const TYPE_STYLE: Record<ColumnType, string> = {
  number: 'text-muted',
  text: 'text-muted',
  mixed: 'bg-review-soft text-review font-medium',
}

export function PreviewTable({ table, types }: { table: Table; types: ColumnType[] }) {
  const rows = table.rows.slice(0, 5)
  return (
    <div>
      <div className="overflow-x-auto rounded-md border border-line bg-surface">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 border-b border-r border-line bg-bg px-2 py-2 text-left font-medium text-muted">Row</th>
              {table.headers.map((h, i) => (
                <th key={h} scope="col" className="border-b border-line bg-bg px-3 py-2 text-left align-bottom font-medium whitespace-nowrap">
                  <span className="block">{h}</span>
                  <span className={`mt-0.5 inline-block rounded-sm px-1 font-mono text-[11px] ${TYPE_STYLE[types[i]!]}`}>{types[i]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className="border-b border-line last:border-0">
                <td className="tnum sticky left-0 border-r border-line bg-surface px-2 py-1.5 font-mono text-muted">{table.rowNumbers[r]}</td>
                {row.map((cell, c) => (
                  <td key={c} className="px-3 py-1.5 font-mono whitespace-pre">
                    {cell.kind === 'blank' ? <span className="text-muted/60">—</span> : cell.raw}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface PickerProps {
  headers: string[]
  idColumn: string
  nameColumn: string
  matchColumns: string[]
  onChange: (c: { idColumn?: string; nameColumn?: string; matchColumns?: string[] }) => void
}

export function ColumnPickers({ headers, idColumn, nameColumn, matchColumns, onChange }: PickerProps) {
  const free = headers.filter((h) => !matchColumns.includes(h) && h !== nameColumn)
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
      <div className="flex flex-col gap-1">
        <label htmlFor="id-col" className="label">ID column</label>
        <select id="id-col" className="field w-full min-w-0" value={idColumn} onChange={(e) => onChange({ idColumn: e.target.value })}>
          <option value="">None</option>
          {headers.map((h) => <option key={h}>{h}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="name-col" className="label">Name column</label>
        <select id="name-col" className="field w-full min-w-0" value={nameColumn} onChange={(e) => onChange({ nameColumn: e.target.value })}>
          <option value="">None</option>
          {headers.map((h) => <option key={h}>{h}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="match-add" className="label">Also match duplicates on</label>
        <div className="flex flex-wrap items-center gap-1.5">
          {matchColumns.map((c) => (
            <span key={c} className="inline-flex items-center gap-1 rounded-sm border border-line-strong bg-surface py-0.5 pr-0.5 pl-2 text-xs">
              {c}
              <button
                type="button"
                className="rounded-sm p-0.5 text-muted hover:text-ink"
                aria-label={`Stop matching on ${c}`}
                onClick={() => onChange({ matchColumns: matchColumns.filter((m) => m !== c) })}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </span>
          ))}
          <select
            id="match-add"
            className="field max-w-full min-w-0 py-1 text-xs"
            value=""
            onChange={(e) => e.target.value && onChange({ matchColumns: [...matchColumns, e.target.value] })}
          >
            <option value="">{matchColumns.length ? 'Add column…' : 'Choose a column…'}</option>
            {free.map((h) => <option key={h}>{h}</option>)}
          </select>
        </div>
        <p className="text-xs text-muted">
          {nameColumn && matchColumns.length
            ? `Students with matching names and the same ${matchColumns.join(' and ')} are flagged for review.`
            : 'Pick a name column and at least one column, such as date of birth, to look for duplicate students.'}
        </p>
      </div>
    </div>
  )
}
