// Every sentence a user reads comes from here, so the wording stays consistent.
import type { Cell } from './types'

/** Numbers appear bare (74.6); anything else is quoted ('AB'). */
export const showValue = (cell: Cell) => (cell.kind === 'number' ? cell.raw.trim() : `'${cell.raw}'`)

const list = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`

export const reasons = {
  below: (col: string, cell: Cell, limit: string) => `${col} is ${showValue(cell)}, below the ${limit} limit.`,
  above: (col: string, cell: Cell, limit: string) => `${col} is ${showValue(cell)}, above the ${limit} limit.`,
  nearLimit: (col: string, cell: Cell, margin: number, limit: string) =>
    `${col} is ${showValue(cell)}, within ${margin} of the ${limit} limit. Confirm before deciding.`,
  storedAsText: (col: string, cell: Cell) => `${col} is ${showValue(cell)}, a number stored as text. Confirm the value.`,
  readAs: (value: number, verdict: 'below' | 'above' | 'near', limit: string) =>
    verdict === 'near'
      ? `Read as ${value}, it is close to the ${limit} limit.`
      : `Read as ${value}, it is ${verdict} the ${limit} limit.`,
  notANumber: (col: string, cell: Cell) => `${col} is ${showValue(cell)}, not a number. Check manually.`,
  commaDecimal: (col: string, cell: Cell) =>
    `${col} is ${showValue(cell)}, which uses a comma. Check whether it means ${cell.raw.trim().replace(',', '.')}.`,
  blank: (col: string) => `${col} is blank.`,
  notEqual: (col: string, cell: Cell, expected: string) => `${col} is ${showValue(cell)}, not '${expected}'.`,
  excluded: (col: string, cell: Cell) => `${col} is ${showValue(cell)}, which is not allowed.`,
  notOneOf: (col: string, cell: Cell, options: string[]) =>
    `${col} is ${showValue(cell)}, not one of: ${options.map((o) => `'${o}'`).join(', ')}.`,
  meetsAll: (n: number) => (n === 1 ? 'Meets the rule.' : `Meets all ${n} rules.`),
  duplicateId: (col: string, id: string, rows: number[]) =>
    `${col} ${id} appears ${rows.length === 2 ? 'twice' : `${rows.length} times`} (rows ${list(rows.map(String))}).`,
  likelyDuplicate: (otherRow: number, name: string, otherName: string, shared: string[]) =>
    `Possible duplicate of row ${otherRow}: '${name}' and '${otherName}' share ${list(shared)}.`,
}
