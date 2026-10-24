import { MAX_RULES } from './check'
import type { CheckOptions, Condition, Rule } from './types'

/** What a saved .json holds: column names and rules only, never student data. */
export interface RuleSet extends CheckOptions {
  rules: Rule[]
  matchColumns: string[]
}

interface RuleSetFile {
  app: 'rollcheck'
  version: 1
  rules: { column: string; condition: Condition; value: string; margin: number }[]
  idColumn?: string
  nameColumn?: string
  matchColumns: string[]
}

export class RuleSetError extends Error {
  constructor(message = 'This is not a Rollcheck rule set.') {
    super(message)
    this.name = 'RuleSetError'
  }
}

const CONDITIONS: Condition[] = ['atLeast', 'atMost', 'equals', 'isNot', 'oneOf', 'notBlank']

export function serializeRuleSet(set: RuleSet): string {
  const file: RuleSetFile = {
    app: 'rollcheck',
    version: 1,
    rules: set.rules.map(({ column, condition, value, margin }) => ({ column, condition, value, margin })),
    ...(set.idColumn ? { idColumn: set.idColumn } : {}),
    ...(set.nameColumn ? { nameColumn: set.nameColumn } : {}),
    matchColumns: set.matchColumns,
  }
  return JSON.stringify(file, null, 2)
}

const isString = (v: unknown): v is string => typeof v === 'string'

/** Read a saved rule set and report which of its columns this file doesn't have. */
export function parseRuleSet(text: string, headers: string[]): { ruleSet: RuleSet; missingColumns: string[] } {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new RuleSetError()
  }
  const f = data as Partial<RuleSetFile>
  if (!f || f.app !== 'rollcheck' || f.version !== 1 || !Array.isArray(f.rules)) throw new RuleSetError()
  if (f.rules.length === 0 || f.rules.length > MAX_RULES) throw new RuleSetError(`A rule set holds 1 to ${MAX_RULES} rules.`)

  const rules: Rule[] = f.rules.map((raw, k) => {
    const x = raw as Partial<Rule>
    if (!isString(x.column) || !CONDITIONS.includes(x.condition as Condition) || !isString(x.value)) {
      throw new RuleSetError(`Rule ${k + 1} in this file is not valid.`)
    }
    const margin = typeof x.margin === 'number' && Number.isFinite(x.margin) && x.margin >= 0 ? x.margin : 1
    return { id: `r${k + 1}`, column: x.column, condition: x.condition as Condition, value: x.value, margin }
  })
  const matchColumns = Array.isArray(f.matchColumns) ? f.matchColumns.filter(isString) : []
  const ruleSet: RuleSet = {
    rules,
    matchColumns,
    ...(isString(f.idColumn) ? { idColumn: f.idColumn } : {}),
    ...(isString(f.nameColumn) ? { nameColumn: f.nameColumn } : {}),
  }
  const wanted = [...rules.map((r) => r.column), ...matchColumns, ruleSet.idColumn, ruleSet.nameColumn].filter(isString)
  const missingColumns = [...new Set(wanted.filter((c) => !headers.includes(c)))]
  return { ruleSet, missingColumns }
}
