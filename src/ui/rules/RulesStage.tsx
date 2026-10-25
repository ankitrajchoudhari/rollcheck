import type { ReactNode } from 'react'
import type { Table } from '../../engine'
import { fmt } from '../copy'
import { Section } from '../shell/Section'
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
  /** The rule builder. */
  children: ReactNode
  /** The "Your check" panel. */
  aside: ReactNode
  ruleActions?: ReactNode
}

export function RulesStage({ table, sheets, idColumn, nameColumn, matchColumns, busy, message, onSheet, onColumns, children, aside, ruleActions }: Props) {
  const types = useColumnTypes(table)
  const mixed = types.filter((t) => t === 'mixed').length
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Set the eligibility rules</h1>
        <p className="mt-1 max-w-[70ch] text-sm text-muted">
          Choose what a student must meet. Rollcheck checks all {fmt(table.rows.length)} rows and sends anything uncertain to Needs review instead of guessing.
        </p>
      </div>

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

      {/* One column on narrow screens (rules, then the check panel); rules beside a sticky panel from 900px. */}
      <div className="grid items-start gap-5 min-[900px]:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 min-[900px]:col-start-1 min-[900px]:row-start-1">
          <Section n="A" id="rules" title="Rules" hint="A student is eligible only when every rule is met." action={ruleActions}>
            {children}
          </Section>
        </div>

        <aside aria-label="Your check" className="min-[900px]:sticky min-[900px]:top-4 min-[900px]:col-start-2 min-[900px]:row-span-2 min-[900px]:row-start-1">
          {aside}
        </aside>

        <div className="min-w-0 space-y-5 min-[900px]:col-start-1 min-[900px]:row-start-2">

          <Section n="B" id="identity" title="Student identity" hint="Used to spot repeated IDs and the same student entered twice. Flagged only, never merged.">
            <ColumnPickers headers={table.headers} idColumn={idColumn} nameColumn={nameColumn} matchColumns={matchColumns} onChange={onColumns} />
          </Section>

          <Section
            n="C"
            id="preview"
            title="Your file, as read"
            hint={
              <>
                First 5 rows, values exactly as in the file.
                {mixed > 0 && (
                  <>
                    {' '}
                    <span className="rounded-sm bg-review-soft px-1 text-review">mixed</span> columns hold both numbers and text.
                  </>
                )}
              </>
            }
          >
            <PreviewTable table={table} types={types} />
          </Section>
        </div>
      </div>
    </div>
  )
}
