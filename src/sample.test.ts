import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { checkTable, readFileToTable } from './engine'
import { sampleColumns, sampleRules } from './ui/sampleRules'

interface Trap { row: number; id: string; column: string; what: string; expect: string }
const manifest = JSON.parse(readFileSync('data/sample-traps.json', 'utf8')) as { students: number; traps: Trap[] }
const { table } = readFileToTable('rollcheck-sample.csv', readFileSync('public/sample/rollcheck-sample.csv'))
const result = checkTable(table, sampleRules(), sampleColumns)

describe('bundled sample data with the demo rules', () => {
  it('has 120 students and the counts add up', () => {
    expect(table.rows).toHaveLength(120)
    expect(manifest.students).toBe(120)
    const { eligible, notEligible, review, total } = result.counts
    expect(total).toBe(120)
    expect(eligible + notEligible + review).toBe(120)
  })

  it.each(manifest.traps.map((t) => [t.row, t.what, t] as const))('row %i (%s) lands in Needs review with its reason', (_, __, trap) => {
    const i = table.rowNumbers.indexOf(trap.row)
    expect(i).toBeGreaterThanOrEqual(0)
    expect(table.rows[i]![0]!.raw).toBe(trap.id)
    expect(result.rows[i]!.status).toBe('review')
    expect(result.rows[i]!.reasons.join(' ')).toContain(trap.expect)
  })

  it('shows trap values exactly as written', () => {
    const raw = (id: string, col: string) => table.rows.find((r) => r[0]!.raw === id)![table.headers.indexOf(col)]!.raw
    const byWhat = (w: string) => manifest.traps.find((t) => t.what.startsWith(w))!.id
    expect(raw(byWhat('Number with a trailing space'), 'absences')).toBe('10 ')
    expect(raw(byWhat('"AB"'), 'absences')).toBe('AB')
    expect(raw(byWhat('Comma used'), 'G3')).toBe('9,8')
  })
})
