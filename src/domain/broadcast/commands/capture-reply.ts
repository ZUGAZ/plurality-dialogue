import { Schema } from "effect"

export const CaptureReply = Schema.TaggedStruct("CaptureReply", {})

export type CaptureReply = typeof CaptureReply.Type

export const isCaptureReply = Schema.is(CaptureReply)
