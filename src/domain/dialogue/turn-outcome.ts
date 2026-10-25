import { Schema } from "effect"
import { TranscriptEntry } from "./transcript-entry"
import { TurnFailedReason } from "./turn-failed-reason"

export const TurnSucceeded = Schema.TaggedStruct("TurnSucceeded", {
  entry: TranscriptEntry,
})

export type TurnSucceeded = typeof TurnSucceeded.Type

// `raw` is the captured text and is present only for "format-failure".
export const TurnFailed = Schema.TaggedStruct("TurnFailed", {
  reason: TurnFailedReason,
  raw: Schema.optional(Schema.String),
})

export type TurnFailed = typeof TurnFailed.Type

export const isTurnSucceeded = Schema.is(TurnSucceeded)

export const isTurnFailed = Schema.is(TurnFailed)
