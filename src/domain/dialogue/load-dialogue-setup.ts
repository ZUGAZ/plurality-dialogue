import { Effect, Either, Option } from "effect"
import { Storage } from "../ports/storage"
import {
  decodeDialogueSetup,
  dialogueSetupStorageKey,
  emptyDialogueSetup,
} from "./dialogue-setup"

const warnEmptySetup = Effect.logWarning(
  "dialogue setup is missing or unreadable",
  dialogueSetupStorageKey,
).pipe(Effect.as(emptyDialogueSetup))

export const loadDialogueSetup = Effect.fn("loadDialogueSetup")(function* () {
  const storage = yield* Storage
  const stored = yield* storage
    .get(dialogueSetupStorageKey)
    .pipe(Effect.orElseSucceed(() => Option.none<unknown>()))
  return yield* Option.match(stored, {
    onNone: () => warnEmptySetup,
    onSome: (value) =>
      Either.match(decodeDialogueSetup(value), {
        onLeft: () => warnEmptySetup,
        onRight: (setup) => Effect.succeed(setup),
      }),
  })
})
