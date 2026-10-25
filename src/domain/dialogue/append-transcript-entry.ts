import { Effect } from "effect"
import type { TranscriptEntry } from "./transcript-entry"
import { loadDialogueTranscript } from "./load-dialogue-transcript"
import { persistDialogueTranscript } from "./persist-dialogue-transcript"

export const appendTranscriptEntry = Effect.fn("appendTranscriptEntry")(
  function* (entry: TranscriptEntry) {
    const current = yield* loadDialogueTranscript()
    return yield* persistDialogueTranscript({
      entries: [...current.entries, entry],
    })
  },
)
