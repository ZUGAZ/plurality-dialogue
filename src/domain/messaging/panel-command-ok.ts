import { Schema } from "effect"
import { ProviderId } from "../provider/provider-id"

export const PanelVerb = Schema.Literal("filled", "submitted")

export type PanelVerb = typeof PanelVerb.Type

export const PanelCommandOk = Schema.TaggedStruct("PanelCommandOk", {
  verb: PanelVerb,
  providerId: ProviderId,
  panelId: Schema.String.pipe(Schema.nonEmptyString()),
})

export type PanelCommandOk = typeof PanelCommandOk.Type

export const isPanelCommandOk = Schema.is(PanelCommandOk)
