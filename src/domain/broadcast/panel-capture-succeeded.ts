import { Schema } from "effect"
import { ProviderId } from "../provider/provider-id"

export const PanelCaptureSucceeded = Schema.TaggedStruct(
  "PanelCaptureSucceeded",
  {
    panelId: Schema.String.pipe(Schema.nonEmptyString()),
    providerId: ProviderId,
    text: Schema.Trim.pipe(Schema.nonEmptyString()),
  },
)

export type PanelCaptureSucceeded = typeof PanelCaptureSucceeded.Type

export const isPanelCaptureSucceeded = Schema.is(PanelCaptureSucceeded)
