import { checkTable, readFileToTable, type OnProgress, type Table } from '../engine'
import type { Reply, Request } from './protocol'
import { toFailure } from './protocol'

/**
 * Holds the file and parsed table between messages, so a check doesn't resend
 * the whole sheet. Used inside the worker, and in-thread when workers are unavailable.
 */
export class EngineSession {
  private fileName = ''
  private bytes: Uint8Array | null = null
  private table: Table | null = null

  handle(req: Request, post: (reply: Reply) => void): void {
    const progress: OnProgress = (p) => post({ id: req.id, type: 'progress', progress: p })
    try {
      switch (req.type) {
        case 'read': {
          if (req.bytes && req.fileName !== undefined) {
            this.bytes = req.bytes
            this.fileName = req.fileName
          }
          if (!this.bytes) throw new Error('Choose a file first.')
          const result = readFileToTable(this.fileName, this.bytes, req.sheet, progress)
          this.table = result.table
          post({ id: req.id, type: 'read', result })
          return
        }
        case 'check': {
          if (!this.table) throw new Error('Choose a file first.')
          post({ id: req.id, type: 'check', result: checkTable(this.table, req.rules, req.options, progress) })
          return
        }
        case 'reset':
          this.bytes = null
          this.table = null
          this.fileName = ''
          post({ id: req.id, type: 'reset' })
          return
      }
    } catch (e) {
      post({ id: req.id, type: 'error', error: toFailure(e) })
    }
  }
}
