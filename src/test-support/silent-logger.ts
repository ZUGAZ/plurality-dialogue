import { Layer, Logger } from "effect"

export const silentLoggerLayer: Layer.Layer<never> = Logger.replace(
  Logger.defaultLogger,
  Logger.none,
)
