import { Schema } from "effect"
import { ProviderId } from "../provider/provider-id"

export const PanelFrameReady = Schema.TaggedStruct("PanelFrameReady", {
  providerId: ProviderId,
  panelId: Schema.String.pipe(Schema.nonEmptyString()),
})

export type PanelFrameReady = typeof PanelFrameReady.Type

export const isPanelFrameReady = Schema.is(PanelFrameReady)
