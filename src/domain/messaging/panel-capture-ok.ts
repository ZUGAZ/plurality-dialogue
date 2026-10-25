import { Schema } from "effect"
import { ProviderId } from "../provider/provider-id"

export const PanelCaptureOk = Schema.TaggedStruct("PanelCaptureOk", {
  text: Schema.Trim.pipe(Schema.nonEmptyString()),
  providerId: ProviderId,
  panelId: Schema.String.pipe(Schema.nonEmptyString()),
})

export type PanelCaptureOk = typeof PanelCaptureOk.Type

export const isPanelCaptureOk = Schema.is(PanelCaptureOk)
