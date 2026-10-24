import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { checkTable, RuleError } from './check'
import { columnStats, columnType, detectColumns, isMostlyNonNumeric } from './columns'
import { decideStatus } from './group'
import { assertInvariant, InvariantError } from './invariant'
import { readFileToTable } from './read'
import { rule, tableOf } from './test-helpers'

const t = tableOf([
  ['ID', 'Name', 'absences', 'G3'],
  ['S001', 'Ana', '2', '15'], // eligible
  ['S002', 'Rui', '30', 'AB'], // clear fail + review → not eligible
  ['S003', 'Eva', '3', '9.6'], // near limit → review
  ['S004', 'Ivo', '', '12'], // blank → review
  ['S005', 'Leo', '4', '5'], // fail
])
const rules = [rule('absences', 'atMost', '10'), rule('G3', 'atLeast', '10')]

describe('checkTable', () => {
  const res = checkTable(t, rules, { idColumn: 'ID', nameColumn: 'Name' })

  it('puts every row in exactly one group, and the counts add up', () => {
    expect(res.counts).toEqual({ eligible: 1, notEligible: 2, review: 2, total: 5 })
    expect(res.rows.map((r) => r.status)).toEqual(['eligible', 'not-eligible', 'review', 'review', 'not-eligible'])
  })

  it('lists every reason, failures first', () => {
    expect(res.rows[0]!.reasons).toEqual(['Meets all 2 rules.'])
    expect(res.rows[1]!.reasons).toEqual(['absences is 30, above the 10 limit.', "G3 is 'AB', not a number. Check manually."])
    expect(res.rows[3]!.reasons).toEqual(['absences is blank.'])
  })

  it('orders Needs review first, then Not eligible, then Eligible, keeping file order', () => {
    expect(res.order).toEqual([2, 3, 1, 4, 0])
  })

  it('reports each rule\'s impact', () => {
    expect(res.impact).toEqual([
      { ruleId: rules[0]!.id, failed: 1, review: 1 },
      { ruleId: rules[1]!.id, failed: 1, review: 2 },
    ])
  })

  it('a duplicate flag alone sends an otherwise eligible row to review', () => {
    const d = tableOf([['ID', 'G3'], ['S1', '15'], ['S1', '16']])
    const out = checkTable(d, [rule('G3', 'atLeast', '10')], { idColumn: 'ID' })
    expect(out.counts.review).toBe(2)
    expect(out.rows[0]!.reasons).toEqual(['ID S1 appears twice (rows 2 and 3).'])
  })

  it('refuses no rules, too many rules and incomplete rules', () => {
    expect(() => checkTable(t, [])).toThrow('Add at least one rule.')
    expect(() => checkTable(t, Array.from({ length: 6 }, () => rule('G3', 'notBlank')))).toThrow('Up to 5 rules.')
    expect(() => checkTable(t, [rule('G3', 'atLeast', 'x')])).toThrow(RuleError)
  })

  it('reports progress on large tables', () => {
    const big = tableOf([['G3'], ...Array.from({ length: 12000 }, (_, i) => [String(i % 20)])])
    const seen: number[] = []
    const out = checkTable(big, [rule('G3', 'atLeast', '10')], {}, (p) => seen.push(p.done))
    expect(out.counts.total).toBe(12000)
    expect(seen).toEqual([5000, 10000, 12000])
  })
})

describe('the real UCI data with the demo rules', () => {
  it('checks all 395 students and the counts add up', () => {
    const { table } = readFileToTable('student-mat.csv', readFileSync('data/source/student-mat.csv'))
    const out = checkTable(table, [rule('absences', 'atMost', '10'), rule('G3', 'atLeast', '10')])
    const { eligible, notEligible, review, total } = out.counts
    expect(total).toBe(395)
    expect(eligible + notEligible + review).toBe(395)
    expect(Math.min(eligible, notEligible, review)).toBeGreaterThan(0)
  })
})

describe('invariant', () => {
  const good = () => checkTable(t, rules)

  it('passes a correct result', () => {
    expect(() => assertInvariant(good(), 5)).not.toThrow()
  })

  it.each([
    ['wrong total', (r: ReturnType<typeof good>) => void (r.counts.eligible += 1)],
    ['row placed twice', (r: ReturnType<typeof good>) => void (r.order[1] = r.order[0]!)],
    ['row missing from order', (r: ReturnType<typeof good>) => void r.order.pop()],
    ['row without a reason', (r: ReturnType<typeof good>) => void (r.rows[2]!.reasons = [])],
  ])('throws, showing no partial results, on %s', (_, corrupt) => {
    const r = good()
    corrupt(r)
    expect(() => assertInvariant(r, 5)).toThrow(InvariantError)
    expect(() => assertInvariant(r, 5)).toThrow('The counts did not add up, so no results are shown. Nothing was changed.')
  })

  it('a table of 6 rows cannot pass with 5 results', () => {
    expect(() => assertInvariant(good(), 6)).toThrow(InvariantError)
  })
})

describe('decideStatus precedence', () => {
  it('fail beats review beats eligible', () => {
    const o = (result: 'pass' | 'fail' | 'review') => ({ ruleId: 'x', result, reasons: [] })
    expect(decideStatus([o('fail'), o('review')], ['dup'])).toBe('not-eligible')
    expect(decideStatus([o('pass'), o('review')], [])).toBe('review')
    expect(decideStatus([o('pass')], ['dup'])).toBe('review')
    expect(decideStatus([o('pass')], [])).toBe('eligible')
  })
})

describe('columns', () => {
  const c = tableOf([['n', 'm', 'x', 'e'], ['1', '1', 'a', ''], ['2', 'AB', 'b', ''], ['3', '75 %', 'c', '']])
  it('tags number, text and mixed columns', () => {
    expect(columnType(columnStats(c, 'n'))).toBe('number')
    expect(columnType(columnStats(c, 'm'))).toBe('mixed')
    expect(columnType(columnStats(c, 'x'))).toBe('text')
    expect(columnType(columnStats(c, 'e'))).toBe('text')
  })

  it('warns when more than half the filled cells are not numbers', () => {
    expect(isMostlyNonNumeric(columnStats(c, 'm'))).toBe(false) // 1 of 3
    expect(isMostlyNonNumeric(columnStats(c, 'x'))).toBe(true)
    const half = tableOf([['h'], ['1'], ['AB']])
    expect(isMostlyNonNumeric(columnStats(half, 'h'))).toBe(false) // exactly half is not "more than half"
  })

  it('guesses ID, name and match columns from headers', () => {
    expect(detectColumns(['Roll No', 'Father Name', 'Student Name', 'Date of Birth', 'Email', 'Marks'])).toEqual({
      idColumn: 'Roll No',
      nameColumn: 'Student Name',
      matchColumns: ['Date of Birth', 'Email'],
    })
    expect(detectColumns(['school', 'age', 'G3'])).toEqual({ matchColumns: [] })
  })
})
