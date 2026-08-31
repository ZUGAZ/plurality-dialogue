import { Schema } from "effect"
import { ProviderId } from "../provider/provider-id"

export const PanelSucceeded = Schema.TaggedStruct("PanelSucceeded", {
  panelId: Schema.String.pipe(Schema.nonEmptyString()),
  providerId: ProviderId,
  verb: Schema.Literal("filled", "submitted"),
})

export type PanelSucceeded = typeof PanelSucceeded.Type

export const isPanelSucceeded = Schema.is(PanelSucceeded)
