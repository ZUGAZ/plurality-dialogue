import { Schema } from "effect"

const trimmedNonEmpty = Schema.Trim.pipe(Schema.nonEmptyString())

// `at` is ISO-8601 UTC, stamped by the turn runner when the line is accepted.
export const TranscriptEntry = Schema.Struct({
  speaker: trimmedNonEmpty,
  text: trimmedNonEmpty,
  at: Schema.String.pipe(Schema.nonEmptyString()),
})

export type TranscriptEntry = typeof TranscriptEntry.Type

export const decodeTranscriptEntry = Schema.decodeUnknownEither(TranscriptEntry)
