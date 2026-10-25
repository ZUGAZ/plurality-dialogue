import { Schema } from "effect"
import { PanelFailedReason } from "../broadcast/panel-failed"

// PanelFailedReason already carries the send and capture literals
// (reply-not-found, reply-still-streaming, empty-reply, capture-unsupported).
export const TurnFailedReason = Schema.Union(
  PanelFailedReason,
  Schema.Literal("format-failure", "composer-empty"),
)

export type TurnFailedReason = typeof TurnFailedReason.Type
