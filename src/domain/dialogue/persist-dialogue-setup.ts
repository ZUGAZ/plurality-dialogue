import { Effect, Schema } from "effect"
import { Storage } from "../ports/storage"
import { DialogueSetup, dialogueSetupStorageKey } from "./dialogue-setup"

export const persistDialogueSetup = Effect.fn("persistDialogueSetup")(
  function* (setup: DialogueSetup) {
    const storage = yield* Storage
    const encoded = yield* Schema.encode(DialogueSetup)(setup)
    return yield* storage.set(dialogueSetupStorageKey, encoded)
  },
)
