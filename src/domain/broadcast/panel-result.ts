import { Schema } from "effect"
import { PanelFailed } from "./panel-failed"
import { PanelSucceeded } from "./panel-succeeded"

export const PanelResult = Schema.Union(PanelSucceeded, PanelFailed)

export type PanelResult = typeof PanelResult.Type

export const isPanelResult = Schema.is(PanelResult)
