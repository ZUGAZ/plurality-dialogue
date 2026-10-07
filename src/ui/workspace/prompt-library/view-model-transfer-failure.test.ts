// @vitest-environment happy-dom
import { Effect, Either, Layer, Option } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { inMemoryPromptLibraryLayer } from "@domain/ports/in-memory-prompt-library"
import {
  PromptLibrary,
  PromptLibraryWriteError,
} from "@domain/ports/prompt-library"
import { decodePrompt } from "@domain/prompt/prompt"
import { silentLoggerLayer } from "@test-support/silent-logger"
import { couldNotImportText } from "./model"
import {
  recordDeps,
  runLibrary,
} from "./view-model-harness"

const libraryPrompt = (
  id: string,
  title: string,
  fields: {
    readonly body?: string
    readonly favorite?: boolean
    readonly updatedAt?: number
    readonly lastUsedAt?: number
  } = {},
) => ({
  id,
  title,
  body: fields.body ?? `Body ${id}`,
  tags: ["work"],
  favorite: fields.favorite ?? false,
  createdAt: 1,
  updatedAt: fields.updatedAt ?? 2,
  ...(fields.lastUsedAt === undefined
    ? {}
    : { lastUsedAt: fields.lastUsedAt }),
})

const libraryText = (prompts: readonly unknown[]) =>
  JSON.stringify({ version: 1, prompts })

const importReads = { count: 0 }

const failOnSecondPut = (initial: readonly unknown[]) => {
  const library = Layer.effect(
    PromptLibrary,
    Effect.gen(function* () {
      const inner = yield* PromptLibrary
      let putsRemaining = 1
      return {
        getAll: () =>
          inner.getAll().pipe(
            Effect.tap(() =>
              Effect.sync(() => {
                importReads.count += 1
              }),
            ),
          ),
        get: (id: string) => inner.get(id),
        delete: (id: string) => inner.delete(id),
        put: (value: unknown) => {
          if (putsRemaining === 0) {
            return Effect.fail(
              new PromptLibraryWriteError({ cause: "stopped" }),
            )
          }
          putsRemaining -= 1
          return inner.put(value)
        },
      }
    }),
  ).pipe(Layer.provide(inMemoryPromptLibraryLayer(initial)))
  return Layer.merge(library, silentLoggerLayer)
}

const localPrompt = libraryPrompt("local", "Local", {
  body: "Stay {name}",
  favorite: true,
  updatedAt: 11,
  lastUsedAt: 12,
})

describe("prompt library import write failure", () => {
  it.layer(failOnSecondPut([localPrompt]))("put failure", (it) => {
    it.effect("shows Could not import and does not refresh", () => {
      const tape = recordDeps()
      const first = libraryPrompt("incoming-a", "Incoming", {
        body: "Keep {name}",
        favorite: true,
        updatedAt: 6,
        lastUsedAt: 7,
      })
      const second = libraryPrompt("incoming-b", "Skipped", {
        updatedAt: 8,
      })
      return runLibrary(tape.deps, (vm) =>
        Effect.gen(function* () {
          importReads.count = 0
          yield* vm.open()
          const readsAfterOpen = importReads.count
          const listed = vm.prompts()
          yield* vm.importLibraryText(libraryText([first, second]))
          expect(vm.actionError()).toBe(couldNotImportText)
          expect(vm.isOpen()).toBe(true)
          expect(vm.mode()).toBe("browse")
          expect(vm.prompts()).toEqual(listed)
          expect(importReads.count).toBe(readsAfterOpen)
          expect(tape.drafts).toEqual([])
          const library = yield* PromptLibrary
          const kept = yield* library.get("incoming-a")
          const skipped = yield* library.get("incoming-b")
          expect(Option.isSome(kept)).toBe(true)
          expect(Option.isNone(skipped)).toBe(true)
          if (Option.isNone(kept)) {
            return
          }
          const decoded = decodePrompt(kept.value)
          if (Either.isLeft(decoded)) {
            expect(Either.isRight(decoded)).toBe(true)
            return
          }
          expect(decoded.right).toEqual(first)
        }),
      )
    })
  })
})
