import { Effect, Layer, Option } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { silentLoggerLayer } from "@test-support/silent-logger"
import { inMemoryStorageLayer } from "../ports/in-memory-storage"
import { Storage } from "../ports/storage"
import { appendTranscriptEntry } from "./append-transcript-entry"
import { clearDialogueTranscript } from "./clear-dialogue-transcript"
import {
  dialogueTranscriptStorageKey,
  emptyDialogueTranscript,
} from "./dialogue-transcript"
import { loadDialogueTranscript } from "./load-dialogue-transcript"

const memory = (initial: Readonly<Record<string, unknown>> = {}) =>
  Layer.mergeAll(inMemoryStorageLayer(initial), silentLoggerLayer)

const first = {
  speaker: "Ada",
  text: "No.",
  at: "2026-01-01T00:00:00.000Z",
}

const second = {
  speaker: "Bea",
  text: "Yes.",
  at: "2026-01-01T00:01:00.000Z",
}

describe("dialogue transcript storage", () => {
  it.layer(memory())("append", (it) => {
    it.effect("adds each entry", () =>
      Effect.gen(function* () {
        yield* appendTranscriptEntry(first)
        yield* appendTranscriptEntry(second)
        expect(yield* loadDialogueTranscript()).toEqual({
          entries: [first, second],
        })
      }),
    )
  })

  it.layer(memory())("clear", (it) => {
    it.effect("writes an empty transcript", () =>
      Effect.gen(function* () {
        const storage = yield* Storage
        yield* appendTranscriptEntry(first)
        yield* clearDialogueTranscript()
        expect(yield* loadDialogueTranscript()).toEqual(emptyDialogueTranscript)
        expect(yield* storage.get(dialogueTranscriptStorageKey)).toEqual(
          Option.some(emptyDialogueTranscript),
        )
      }),
    )
  })

  const withBadRow = { entries: [{ speaker: "Ada" }, first] }
  it.layer(memory({ [dialogueTranscriptStorageKey]: withBadRow }))(
    "one bad row",
    (it) => {
      it.effect("keeps the valid entry and leaves the stored value", () =>
        Effect.gen(function* () {
          const storage = yield* Storage
          expect(yield* loadDialogueTranscript()).toEqual({ entries: [first] })
          expect(yield* storage.get(dialogueTranscriptStorageKey)).toEqual(
            Option.some(withBadRow),
          )
        }),
      )
    },
  )

  const corrupt = { entries: "nope" }
  it.layer(memory({ [dialogueTranscriptStorageKey]: corrupt }))(
    "corrupt top level",
    (it) => {
      it.effect("loads empty and leaves the stored value", () =>
        Effect.gen(function* () {
          const storage = yield* Storage
          expect(yield* loadDialogueTranscript()).toEqual(
            emptyDialogueTranscript,
          )
          expect(yield* storage.get(dialogueTranscriptStorageKey)).toEqual(
            Option.some(corrupt),
          )
        }),
      )
    },
  )
})
