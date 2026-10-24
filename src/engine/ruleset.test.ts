import { describe, expect, it } from 'vitest'
import { checkTable } from './check'
import { parseRuleSet, RuleSetError, serializeRuleSet } from './ruleset'
import { rule, tableOf } from './test-helpers'

const headers = ['ID', 'Name', 'absences', 'G3', 'DOB']
const set = {
  rules: [rule('absences', 'atMost', '10'), rule('G3', 'atLeast', '10', 0.5)],
  idColumn: 'ID',
  nameColumn: 'Name',
  matchColumns: ['DOB'],
}

describe('rule sets', () => {
  it('round-trips and reproduces the same counts', () => {
    const t = tableOf([headers, ['1', 'A', '2', '15', 'x'], ['2', 'B', '20', '9.8', 'y']])
    const { ruleSet, missingColumns } = parseRuleSet(serializeRuleSet(set), headers)
    expect(missingColumns).toEqual([])
    expect(ruleSet.rules.map(({ column, condition, value, margin }) => ({ column, condition, value, margin }))).toEqual([
      { column: 'absences', condition: 'atMost', value: '10', margin: 1 },
      { column: 'G3', condition: 'atLeast', value: '10', margin: 0.5 },
    ])
    expect(checkTable(t, ruleSet.rules, ruleSet).counts).toEqual(checkTable(t, set.rules, set).counts)
  })

  it('holds no student data', () => {
    const json = JSON.parse(serializeRuleSet(set))
    expect(Object.keys(json).sort()).toEqual(['app', 'idColumn', 'matchColumns', 'nameColumn', 'rules', 'version'])
  })

  it('reports columns the current file does not have', () => {
    const { missingColumns } = parseRuleSet(serializeRuleSet(set), ['ID', 'Name', 'Attendance %', 'G3'])
    expect(missingColumns).toEqual(['absences', 'DOB'])
  })

  it.each([
    ['not JSON', 'nope'],
    ['another app', '{"app":"x","version":1,"rules":[]}'],
    ['no rules', '{"app":"rollcheck","version":1,"rules":[]}'],
    ['bad condition', '{"app":"rollcheck","version":1,"rules":[{"column":"a","condition":"bigger","value":"1"}]}'],
  ])('rejects %s', (_, text) => {
    expect(() => parseRuleSet(text, headers)).toThrow(RuleSetError)
  })
})
