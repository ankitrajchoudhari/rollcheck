/// <reference lib="webworker" />
import type { Request } from './protocol'
import { EngineSession } from './session'

const session = new EngineSession()

self.onmessage = (event: MessageEvent<Request>) => {
  session.handle(event.data, (reply) => self.postMessage(reply))
}
