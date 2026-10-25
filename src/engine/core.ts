// Engine API for the page (main thread). Leaves out the file parsers, which run in the worker,
// so the page does not load SheetJS or Papa Parse up front.
export * from './types'
export { classifyCell, classifyText } from './classify'
export { UnsupportedFileError, UnreadableFileError } from './errors'
export { NoRowsError } from './normalise'
export { columnStats, columnType, detectColumns, isMostlyNonNumeric } from './columns'
export type { ColumnType, ColumnStats, DetectedColumns } from './columns'
export { isNumberRule, ruleProblem, splitOptions } from './evaluate'
export { checkTable, MAX_RULES, RuleError } from './check'
export { InvariantError } from './invariant'
export { parseRuleSet, serializeRuleSet, RuleSetError } from './ruleset'
export type { RuleSet } from './ruleset'
