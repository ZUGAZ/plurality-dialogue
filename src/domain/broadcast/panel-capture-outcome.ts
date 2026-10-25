import { Schema } from "effect"
import { PanelCaptureFailed } from "./panel-capture-failed"
import { PanelCaptureSucceeded } from "./panel-capture-succeeded"

export const PanelCaptureOutcome = Schema.Union(
  PanelCaptureSucceeded,
  PanelCaptureFailed,
)

export type PanelCaptureOutcome = typeof PanelCaptureOutcome.Type

export const isPanelCaptureSucceeded = Schema.is(PanelCaptureSucceeded)

export const isPanelCaptureFailed = Schema.is(PanelCaptureFailed)
