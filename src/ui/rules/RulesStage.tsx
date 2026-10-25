import type { ReactNode } from 'react'
import type { Table } from '../../engine'
import { Notice } from '../shell/Shell'
import { ColumnPickers, FileSummary, PreviewTable, useColumnTypes } from './FileSummary'

interface Props {
  table: Table
  sheets: string[]
  idColumn: string
  nameColumn: string
  matchColumns: string[]
  busy: boolean
  message: { tone: 'error' | 'info'; text: string } | null
  onSheet: (sheet: string) => void
  onColumns: (c: { idColumn?: string; nameColumn?: string; matchColumns?: string[] }) => void
  children?: ReactNode
}

export function RulesStage({ table, sheets, idColumn, nameColumn, matchColumns, busy, message, onSheet, onColumns, children }: Props) {
  const types = useColumnTypes(table)
  return (
    <section aria-labelledby="rules-title" className="space-y-6">
      <h1 id="rules-title" className="sr-only">Rules</h1>
      <FileSummary table={table} sheets={sheets} onSheet={onSheet} disabled={busy} />
      {table.notices.length > 0 && (
        <Notice tone="info">
          <p className="font-medium">Rollcheck adjusted how this file is read:</p>
          <ul className="mt-1 list-disc pl-5">
            {table.notices.map((n) => (
              <li key={n.message}>{n.message}</li>
            ))}
          </ul>
        </Notice>
      )}
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <ColumnPickers headers={table.headers} idColumn={idColumn} nameColumn={nameColumn} matchColumns={matchColumns} onChange={onColumns} />
      <PreviewTable table={table} types={types} />
      {children}
    </section>
  )
}
