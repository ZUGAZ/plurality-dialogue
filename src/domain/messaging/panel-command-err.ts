import { Schema } from "effect"
import { ProviderId } from "../provider/provider-id"

export const PanelCommandErrReason = Schema.Literal(
  "composer-not-found",
  "composer-not-writable",
  "submit-not-found",
  "submit-disabled",
  "image-attach-failed",
  "timeout",
  "temporary-chat-unavailable",
  "reply-not-found",
  "reply-still-streaming",
  "empty-reply",
  "capture-unsupported",
)

export type PanelCommandErrReason = typeof PanelCommandErrReason.Type

export const PanelCommandErr = Schema.TaggedStruct("PanelCommandErr", {
  providerId: ProviderId,
  panelId: Schema.String.pipe(Schema.nonEmptyString()),
  reason: PanelCommandErrReason,
})

export type PanelCommandErr = typeof PanelCommandErr.Type

export const isPanelCommandErr = Schema.is(PanelCommandErr)
