import { Schema } from "effect"
import { PanelCommandErr } from "./panel-command-err"
import { PanelCommandOk } from "./panel-command-ok"

export const PanelCommandResponse = Schema.Union(PanelCommandOk, PanelCommandErr)

export type PanelCommandResponse = typeof PanelCommandResponse.Type

export const isPanelCommandResponse = Schema.is(PanelCommandResponse)
