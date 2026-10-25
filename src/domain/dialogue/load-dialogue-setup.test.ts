import { Effect, Layer, Option } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { silentLoggerLayer } from "@test-support/silent-logger"
import { inMemoryStorageLayer } from "../ports/in-memory-storage"
import { Storage, StorageReadError, StorageWriteError } from "../ports/storage"
import {
  VendorCastSeat,
  YouCastSeat,
  dialogueSetupStorageKey,
  emptyDialogueSetup,
} from "./dialogue-setup"
import { loadDialogueSetup } from "./load-dialogue-setup"
import { persistDialogueSetup } from "./persist-dialogue-setup"

const memory = (initial: Readonly<Record<string, unknown>> = {}) =>
  Layer.mergeAll(inMemoryStorageLayer(initial), silentLoggerLayer)

const readErrorLayer = Layer.mergeAll(
  Layer.succeed(Storage, {
    get: (key) => Effect.fail(new StorageReadError({ key, cause: "boom" })),
    set: (key) =>
      Effect.fail(new StorageWriteError({ key, cause: "load must not write" })),
  }),
  silentLoggerLayer,
)

describe("load dialogue setup", () => {
  it.layer(memory())("missing key", (it) => {
    it.effect("loads empty and does not write", () =>
      Effect.gen(function* () {
        const storage = yield* Storage
        expect(yield* loadDialogueSetup()).toEqual(emptyDialogueSetup)
        expect(yield* storage.get(dialogueSetupStorageKey)).toEqual(
          Option.none(),
        )
      }),
    )
  })

  const corrupt = { topic: 4 }
  it.layer(memory({ [dialogueSetupStorageKey]: corrupt }))(
    "corrupt object",
    (it) => {
      it.effect("loads empty and leaves the stored value", () =>
        Effect.gen(function* () {
          const storage = yield* Storage
          expect(yield* loadDialogueSetup()).toEqual(emptyDialogueSetup)
          expect(yield* storage.get(dialogueSetupStorageKey)).toEqual(
            Option.some(corrupt),
          )
        }),
      )
    },
  )

  it.layer(readErrorLayer)("read error", (it) => {
    it.effect("loads empty", () =>
      Effect.gen(function* () {
        expect(yield* loadDialogueSetup()).toEqual(emptyDialogueSetup)
      }),
    )
  })

  it.layer(memory())("persist", (it) => {
    it.effect("saves a draft with an empty topic", () =>
      Effect.gen(function* () {
        const draft = {
          topic: "",
          cast: [
            VendorCastSeat.make({
              providerId: "chatgpt",
              roleId: "skeptic",
              name: "Ada",
            }),
            YouCastSeat.make({}),
          ],
        }
        yield* persistDialogueSetup(draft)
        expect(yield* loadDialogueSetup()).toEqual(draft)
      }),
    )
  })
})
