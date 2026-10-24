import { describe, expect, it } from 'vitest'
import { detectReviewCases, namesMatch, normaliseName } from './review'
import { tableOf } from './test-helpers'

describe('name normalising', () => {
  it('lowercases, removes dots, collapses spaces', () => {
    expect(normaliseName('  S.  Kumar ')).toEqual(['s', 'kumar'])
    expect(normaliseName('S.Kumar')).toEqual(['s', 'kumar'])
  })

  it.each([
    ['S. Kumar', 'SURESH KUMAR', true],
    ['Suresh K.', 'suresh kumar', true],
    ['A. Silva', 'Ana Silva', true],
    ['Ana Silva', 'ANA  SILVA', true],
    ['R. Kumar', 'Suresh Kumar', false],
    ['Suresh Kumar', 'Suresh Kumari', false],
    ['Kumar', 'Suresh Kumar', false],
  ])('%s vs %s → %s', (a, b, expected) => {
    expect(namesMatch(normaliseName(a), normaliseName(b))).toBe(expected)
  })
})

describe('duplicate IDs', () => {
  it('flags every row with the ID and names all rows', () => {
    const t = tableOf([['Roll number', 'Name'], ['S017', 'A'], ['S018', 'B'], ['s017 ', 'C']])
    const { flags, duplicateIdRows } = detectReviewCases(t, { idColumn: 'Roll number' })
    expect(duplicateIdRows).toBe(2)
    expect(flags.get(0)).toEqual(['Roll number S017 appears twice (rows 2 and 4).'])
    expect(flags.get(2)).toEqual(['Roll number s017 appears twice (rows 2 and 4).'])
    expect(flags.has(1)).toBe(false)
  })

  it('counts three or more', () => {
    const t = tableOf([['ID'], ['X'], ['X'], ['X']])
    expect(detectReviewCases(t, { idColumn: 'ID' }).flags.get(0)).toEqual(['ID X appears 3 times (rows 2, 3 and 4).'])
  })

  it('ignores blank IDs', () => {
    const t = tableOf([['ID'], [''], ['']])
    expect(detectReviewCases(t, { idColumn: 'ID' }).duplicateIdRows).toBe(0)
  })
})

describe('likely duplicate students', () => {
  const t = tableOf([
    ['ID', 'Name', 'DOB'],
    ['S001', 'S. Kumar', '2004-03-11'],
    ['S002', 'Priya Nair', '2003-01-01'],
    ['S003', 'SURESH KUMAR', '2004-03-11'],
    ['S004', 'Suresh Kumar', '2005-05-05'],
  ])

  it('flags both rows, each naming the other, only when the other column matches too', () => {
    const { flags, likelyDuplicateRows } = detectReviewCases(t, { idColumn: 'ID', nameColumn: 'Name', matchColumns: ['DOB'] })
    expect(likelyDuplicateRows).toBe(2)
    expect(flags.get(0)).toEqual(["Possible duplicate of row 4: 'S. Kumar' and 'SURESH KUMAR' share DOB 2004-03-11."])
    expect(flags.get(2)).toEqual(["Possible duplicate of row 2: 'SURESH KUMAR' and 'S. Kumar' share DOB 2004-03-11."])
    expect(flags.has(3)).toBe(false)
  })

  it('needs every match column to agree', () => {
    const t2 = tableOf([['Name', 'age', 'school'], ['A. Silva', '17', 'GP'], ['Ana Silva', '17', 'MS'], ['ANA SILVA', '17', 'GP']])
    const { flags } = detectReviewCases(t2, { nameColumn: 'Name', matchColumns: ['age', 'school'] })
    expect(flags.get(0)).toEqual(["Possible duplicate of row 4: 'A. Silva' and 'ANA SILVA' share age 17 and school GP."])
    expect(flags.has(1)).toBe(false)
  })

  it('does nothing without a match column — names alone are never enough', () => {
    expect(detectReviewCases(t, { nameColumn: 'Name', matchColumns: [] }).likelyDuplicateRows).toBe(0)
  })

  it('does not report a duplicate-ID pair a second time', () => {
    const t3 = tableOf([['ID', 'Name', 'DOB'], ['S1', 'Ana Silva', 'x'], ['S1', 'Ana Silva', 'x']])
    const { flags } = detectReviewCases(t3, { idColumn: 'ID', nameColumn: 'Name', matchColumns: ['DOB'] })
    expect(flags.get(0)).toEqual(['ID S1 appears twice (rows 2 and 3).'])
  })
})
