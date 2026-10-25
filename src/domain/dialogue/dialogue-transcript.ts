import { Array, Either, Option, Schema, pipe } from "effect"
import { decodeTranscriptEntry, TranscriptEntry } from "./transcript-entry"

export const DialogueTranscript = Schema.Struct({
  entries: Schema.Array(TranscriptEntry),
})

export type DialogueTranscript = typeof DialogueTranscript.Type

// A bad element stays unknown until `decodeTranscriptEntry`, so one corrupt
// row cannot drop its valid siblings.
export const DialogueTranscriptEntries = Schema.Struct({
  entries: Schema.Array(Schema.Unknown),
})

export const emptyDialogueTranscript: DialogueTranscript = { entries: [] }

export const dialogueTranscriptStorageKey = "dialogue-transcript"

const decodeEntries = Schema.decodeUnknownEither(DialogueTranscriptEntries)

export const transcriptFromStored = (stored: unknown): DialogueTranscript =>
  pipe(
    decodeEntries(stored),
    Either.match({
      onLeft: () => emptyDialogueTranscript,
      onRight: ({ entries }) => ({
        entries: Array.filterMap(entries, (entry) =>
          Either.match(decodeTranscriptEntry(entry), {
            onLeft: () => Option.none(),
            onRight: Option.some,
          }),
        ),
      }),
    }),
  )
