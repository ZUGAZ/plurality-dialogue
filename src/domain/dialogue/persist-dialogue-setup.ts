import { Effect, ParseResult, Schema } from "effect"
import { Storage, StorageWriteError } from "../ports/storage"
import { DialogueSetup, dialogueSetupStorageKey } from "./dialogue-setup"

export const persistDialogueSetup = Effect.fn("persistDialogueSetup")(
  function* (setup: DialogueSetup) {
    const storage = yield* Storage
    const encoded = yield* Schema.encode(DialogueSetup)(setup)
    return yield* storage.set(dialogueSetupStorageKey, encoded)
  },
)

export const describeSetupSaveFailure = (
  error: ParseResult.ParseError | StorageWriteError,
): string => {
  if (error._tag === "StorageWriteError") {
    return error.cause instanceof Error
      ? `${error._tag}: ${error.cause.message}`
      : error._tag
  }
  return `${error._tag}: ${error.message}`
}
