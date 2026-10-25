import type { CheckOptions, CheckResult, Progress, Rule } from '../engine'
import type { EngineFailure, ReadReply, Reply, Request } from './protocol'
import { EngineSession } from './session'

export class EngineError extends Error {
  constructor(failure: EngineFailure) {
    super(failure.message)
    this.name = failure.name
  }
}

type Pending = { resolve: (r: Reply) => void; onProgress?: (p: Progress) => void }
type Body = Request extends infer R ? (R extends Request ? Omit<R, 'id'> : never) : never

/** Promise API over the background worker. Falls back to the same engine in-thread when Worker is unavailable (tests). */
export class EngineClient {
  private worker: Worker | null = null
  private session: EngineSession | null = null
  private pending = new Map<number, Pending>()
  private nextId = 1

  constructor() {
    this.start()
  }

  private start() {
    if (typeof Worker === 'undefined') {
      this.session = new EngineSession()
      return
    }
    try {
      this.worker = new Worker(new URL('./rollcheck.worker.ts', import.meta.url), { type: 'module' })
      this.worker.onmessage = (e: MessageEvent<Reply>) => this.receive(e.data)
    } catch {
      this.session = new EngineSession()
    }
  }

  private receive(reply: Reply) {
    const p = this.pending.get(reply.id)
    if (!p) return
    if (reply.type === 'progress') {
      p.onProgress?.(reply.progress)
      return
    }
    this.pending.delete(reply.id)
    p.resolve(reply)
  }

  private send(body: Body, onProgress?: (p: Progress) => void): Promise<Reply> {
    const id = this.nextId++
    const req = { ...body, id } as Request
    return new Promise((resolve) => {
      this.pending.set(id, { resolve, ...(onProgress ? { onProgress } : {}) })
      if (this.worker) {
        this.worker.postMessage(req)
      } else {
        // Yield first so the UI can paint "Reading…" before the synchronous work.
        setTimeout(() => this.session!.handle(req, (r) => this.receive(r)), 0)
      }
    })
  }

  private static unwrap<T extends Reply['type']>(reply: Reply, type: T): Extract<Reply, { type: T }> {
    if (reply.type === 'error') throw new EngineError(reply.error)
    if (reply.type !== type) throw new EngineError({ name: 'Error', message: 'Unexpected reply from the checker.' })
    return reply as Extract<Reply, { type: T }>
  }

  async read(fileName: string, bytes: Uint8Array, onProgress?: (p: Progress) => void): Promise<ReadReply> {
    return EngineClient.unwrap(await this.send({ type: 'read', fileName, bytes }, onProgress), 'read').result
  }

  async readSheet(sheet: string, onProgress?: (p: Progress) => void): Promise<ReadReply> {
    return EngineClient.unwrap(await this.send({ type: 'read', sheet }, onProgress), 'read').result
  }

  async check(rules: Rule[], options: CheckOptions, onProgress?: (p: Progress) => void): Promise<CheckResult> {
    return EngineClient.unwrap(await this.send({ type: 'check', rules, options }, onProgress), 'check').result
  }

  /** Start over: drop the file, and stop any work in progress. */
  reset() {
    for (const p of this.pending.values()) p.resolve({ id: 0, type: 'error', error: { name: 'Cancelled', message: '' } })
    this.pending.clear()
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
      this.start()
    } else {
      this.session = new EngineSession()
    }
  }
}
