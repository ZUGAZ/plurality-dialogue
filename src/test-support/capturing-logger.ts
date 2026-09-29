import { Layer, Logger } from "effect"

export interface CapturingLogger {
  readonly layer: Layer.Layer<never>
  readonly messages: () => readonly unknown[]
}

export const makeCapturingLogger = (): CapturingLogger => {
  const entries: unknown[] = []
  const capturingLogger = Logger.make(({ message }) => {
    entries.push(message)
  })
  return {
    layer: Logger.replace(Logger.defaultLogger, capturingLogger),
    messages: () => [...entries],
  }
}
