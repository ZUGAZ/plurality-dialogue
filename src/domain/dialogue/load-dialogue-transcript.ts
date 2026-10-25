import { Effect, Option, Schema } from "effect"
import { Storage } from "../ports/storage"
import {
  DialogueTranscriptEntries,
  dialogueTranscriptStorageKey,
  emptyDialogueTranscript,
  transcriptFromStored,
} from "./dialogue-transcript"

const isTranscriptDocument = Schema.is(DialogueTranscriptEntries)

const warnEmptyTranscript = Effect.logWarning(
  "dialogue transcript is missing or unreadable",
  dialogueTranscriptStorageKey,
).pipe(Effect.as(emptyDialogueTranscript))

export const loadDialogueTranscript = Effect.fn("loadDialogueTranscript")(
  function* () {
    const storage = yield* Storage
    const stored = yield* storage
      .get(dialogueTranscriptStorageKey)
      .pipe(Effect.orElseSucceed(() => Option.none<unknown>()))
    return yield* Option.match(stored, {
      onNone: () => warnEmptyTranscript,
      onSome: (value) =>
        isTranscriptDocument(value)
          ? Effect.succeed(transcriptFromStored(value))
          : warnEmptyTranscript,
    })
  },
)
