import { Schema } from "effect"
import { ProviderId } from "../provider/provider-id"

export const PanelTarget = Schema.Struct({
  panelId: Schema.String.pipe(Schema.nonEmptyString()),
  providerId: ProviderId,
  tabId: Schema.Number.pipe(Schema.int()),
  frameId: Schema.Number.pipe(Schema.int()),
})

export type PanelTarget = typeof PanelTarget.Type

export const isPanelTarget = Schema.is(PanelTarget)
