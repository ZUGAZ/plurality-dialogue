import { Effect, Schema } from "effect"
import { Storage } from "../ports/storage"
import {
  DialogueTranscript,
  dialogueTranscriptStorageKey,
} from "./dialogue-transcript"

export const persistDialogueTranscript = Effect.fn("persistDialogueTranscript")(
  function* (transcript: DialogueTranscript) {
    const storage = yield* Storage
    const encoded = yield* Schema.encode(DialogueTranscript)(transcript)
    return yield* storage.set(dialogueTranscriptStorageKey, encoded)
  },
)
