import { UnsupportedFileError } from '../engine/core'

/** Check the extension before reading anything, then hand back the bytes. */
export async function readFileBytes(file: File): Promise<Uint8Array> {
  if (!/\.(csv|xlsx)$/i.test(file.name)) throw new UnsupportedFileError()
  return new Uint8Array(await file.arrayBuffer())
}
