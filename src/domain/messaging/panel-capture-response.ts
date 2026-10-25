import { Schema } from "effect"
import { PanelCaptureOk } from "./panel-capture-ok"
import { PanelCommandErr } from "./panel-command-err"

export const PanelCaptureResponse = Schema.Union(
  PanelCaptureOk,
  PanelCommandErr,
)

export type PanelCaptureResponse = typeof PanelCaptureResponse.Type

export const isPanelCaptureResponse = Schema.is(PanelCaptureResponse)
