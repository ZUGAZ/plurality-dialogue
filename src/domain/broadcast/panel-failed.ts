import { Schema } from "effect"
import { PanelCommandErrReason } from "../messaging/panel-command-err"
import { ProviderId } from "../provider/provider-id"

export const PanelFailedReason = Schema.Union(
  PanelCommandErrReason,
  Schema.Literal("frame-not-ready", "messaging-failed"),
)

export type PanelFailedReason = typeof PanelFailedReason.Type

export const PanelFailed = Schema.TaggedStruct("PanelFailed", {
  panelId: Schema.String.pipe(Schema.nonEmptyString()),
  providerId: ProviderId,
  reason: PanelFailedReason,
})

export type PanelFailed = typeof PanelFailed.Type

export const isPanelFailed = Schema.is(PanelFailed)
