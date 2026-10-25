import { Schema } from "effect"
import { ProviderId } from "../provider/provider-id"
import { PanelFailedReason } from "./panel-failed"

export const PanelCaptureFailed = Schema.TaggedStruct("PanelCaptureFailed", {
  panelId: Schema.String.pipe(Schema.nonEmptyString()),
  providerId: ProviderId,
  reason: PanelFailedReason,
})

export type PanelCaptureFailed = typeof PanelCaptureFailed.Type

export const isPanelCaptureFailed = Schema.is(PanelCaptureFailed)
