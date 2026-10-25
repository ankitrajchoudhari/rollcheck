import type { CheckResult, Progress, Rule, Status, Table } from '../engine/core'

export type Stage = 'file' | 'rules' | 'results'

export interface AppState {
  stage: Stage
  busy: { label: string; progress?: Progress } | null
  /** A message for the current stage; `tone` decides how it is shown. */
  message: { tone: 'error' | 'info'; text: string } | null
  fileName: string | null
  sheets: string[]
  table: Table | null
  idColumn: string
  nameColumn: string
  matchColumns: string[]
  rules: Rule[]
  /** Columns a loaded rule set asked for that this file doesn't have. */
  missingColumns: string[]
  result: CheckResult | null
  /** Snapshot of what produced `result` (for export, print and impact labels). */
  checked: { rules: Rule[]; idColumn: string; nameColumn: string; matchColumns: string[]; at: string } | null
  filter: Status | null
  search: string
  selectedRow: number | null
}

export const initialState: AppState = {
  stage: 'file',
  busy: null,
  message: null,
  fileName: null,
  sheets: [],
  table: null,
  idColumn: '',
  nameColumn: '',
  matchColumns: [],
  rules: [],
  missingColumns: [],
  result: null,
  checked: null,
  filter: null,
  search: '',
  selectedRow: null,
}

export type Action =
  | { type: 'busy'; label: string; progress?: Progress }
  | { type: 'failed'; text: string }
  | { type: 'fileRead'; fileName: string; table: Table; sheets: string[]; idColumn: string; nameColumn: string; matchColumns: string[]; rules?: Rule[] }
  | { type: 'sheetRead'; table: Table }
  | { type: 'columns'; idColumn?: string; nameColumn?: string; matchColumns?: string[] }
  | { type: 'rules'; rules: Rule[] }
  | { type: 'ruleSetLoaded'; rules: Rule[]; idColumn?: string; nameColumn?: string; matchColumns: string[]; missingColumns: string[] }
  | { type: 'checked'; result: CheckResult }
  | { type: 'filter'; filter: Status | null }
  | { type: 'search'; search: string }
  | { type: 'openRow'; index: number | null }
  | { type: 'goTo'; stage: Stage }
  | { type: 'startOver' }

const keep = (cols: string[], headers: string[]) => cols.filter((c) => headers.includes(c))

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'busy':
      return { ...state, busy: { label: action.label, ...(action.progress ? { progress: action.progress } : {}) }, message: null }
    case 'failed':
      return { ...state, busy: null, message: { tone: 'error', text: action.text } }
    case 'fileRead':
      return {
        ...initialState,
        stage: 'rules',
        fileName: action.fileName,
        table: action.table,
        sheets: action.sheets,
        idColumn: action.idColumn,
        nameColumn: action.nameColumn,
        matchColumns: action.matchColumns,
        rules: action.rules ?? [],
      }
    case 'sheetRead': {
      const headers = action.table.headers
      const dropped = state.rules.filter((r) => !headers.includes(r.column))
      return {
        ...state,
        busy: null,
        table: action.table,
        result: null,
        checked: null,
        idColumn: headers.includes(state.idColumn) ? state.idColumn : '',
        nameColumn: headers.includes(state.nameColumn) ? state.nameColumn : '',
        matchColumns: keep(state.matchColumns, headers),
        rules: state.rules.filter((r) => headers.includes(r.column)),
        missingColumns: [],
        message: dropped.length
          ? { tone: 'info', text: `${dropped.length === 1 ? 'One rule was' : `${dropped.length} rules were`} removed because this sheet has no ${dropped.map((r) => `"${r.column}"`).join(', ')} column.` }
          : null,
      }
    }
    case 'columns':
      return {
        ...state,
        ...(action.idColumn !== undefined ? { idColumn: action.idColumn } : {}),
        ...(action.nameColumn !== undefined ? { nameColumn: action.nameColumn } : {}),
        ...(action.matchColumns !== undefined ? { matchColumns: action.matchColumns } : {}),
      }
    case 'rules': {
      const headers = state.table?.headers ?? []
      const stillMissing = state.missingColumns.filter((c) => action.rules.some((r) => r.column === c) || state.matchColumns.includes(c))
      return { ...state, rules: action.rules, missingColumns: stillMissing.filter((c) => !headers.includes(c)) }
    }
    case 'ruleSetLoaded': {
      const headers = state.table?.headers ?? []
      return {
        ...state,
        rules: action.rules,
        idColumn: action.idColumn && headers.includes(action.idColumn) ? action.idColumn : state.idColumn,
        nameColumn: action.nameColumn && headers.includes(action.nameColumn) ? action.nameColumn : state.nameColumn,
        matchColumns: keep(action.matchColumns, headers),
        missingColumns: action.missingColumns,
        message: action.missingColumns.length
          ? {
              tone: 'info',
              text: `This rule set uses ${action.missingColumns.length === 1 ? 'a column' : 'columns'} this file does not have: ${action.missingColumns.map((c) => `"${c}"`).join(', ')}. Choose a column for each marked rule.`,
            }
          : { tone: 'info', text: `Rule set loaded: ${action.rules.length} rule${action.rules.length === 1 ? '' : 's'}.` },
      }
    }
    case 'checked':
      return {
        ...state,
        busy: null,
        message: null,
        stage: 'results',
        result: action.result,
        checked: {
          rules: state.rules,
          idColumn: state.idColumn,
          nameColumn: state.nameColumn,
          matchColumns: state.matchColumns,
          at: new Date().toISOString(),
        },
        filter: null,
        search: '',
        selectedRow: null,
      }
    case 'filter':
      return { ...state, filter: action.filter }
    case 'search':
      return { ...state, search: action.search }
    case 'openRow':
      return { ...state, selectedRow: action.index }
    case 'goTo':
      return { ...state, stage: action.stage, message: null, selectedRow: null }
    case 'startOver':
      return initialState
  }
}
