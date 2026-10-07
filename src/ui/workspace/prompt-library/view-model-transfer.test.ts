// @vitest-environment happy-dom
import { Effect, Either, Option, Schema } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { PromptLibrary } from "@domain/ports/prompt-library"
import { listPrompts } from "@domain/prompt/prompt-crud"
import { decodePrompt } from "@domain/prompt/prompt"
import { decodePromptLibraryDocument } from "@domain/prompt/prompt-library-document"
import {
  couldNotLoadPrompts,
  couldNotReadFileText,
  notPromptLibraryText,
} from "./model"
import {
  idleDeps,
  memoryLayer,
  recordDeps,
  runLibrary,
  seededLayer,
  unavailableLibraryLayer,
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

const libraryText = (prompts: readonly unknown[], version: unknown = 1) =>
  JSON.stringify({ version, prompts })

const localPrompt = libraryPrompt("local", "Local", {
  body: "Stay {name}",
  favorite: true,
  updatedAt: 11,
  lastUsedAt: 12,
})

describe("prompt library import and export", () => {
  it.layer(memoryLayer())("empty export", (it) => {
    it.effect("returns the empty document and can export again", () =>
      runLibrary(idleDeps(), (vm) =>
        Effect.gen(function* () {
          const json = yield* vm.exportLibrary()
          expect(json).toBe(JSON.stringify({ version: 1, prompts: [] }))
          expect(vm.pendingExport()?.json).toBe(json)
          const token = vm.pendingExport()?.token
          const again = yield* vm.exportLibrary()
          expect(again).toBe(json)
          expect(vm.pendingExport()?.token).not.toBe(token)
          vm.clearPendingExport()
          expect(vm.pendingExport()).toBeUndefined()
        }),
      ),
    )
  })

  it.layer(
    seededLayer([
      libraryPrompt("a", "Alpha", { favorite: true, lastUsedAt: 4 }),
      libraryPrompt("b", "Beta", { updatedAt: 5 }),
      { id: "corrupt-row", title: 12 },
    ]),
  )("stored export", (it) => {
    it.effect("matches listPrompts and drops corrupt rows", () =>
      runLibrary(idleDeps(), (vm) =>
        Effect.gen(function* () {
          const json = yield* vm.exportLibrary()
          const listed = yield* listPrompts()
          if (json === undefined) {
            expect(json).toBeTypeOf("string")
            return
          }
          expect(json.includes("corrupt-row")).toBe(false)
          const parsed = Schema.decodeUnknownEither(Schema.parseJson())(json)
          if (Either.isLeft(parsed)) {
            expect(Either.isRight(parsed)).toBe(true)
            return
          }
          const decoded = decodePromptLibraryDocument(parsed.right)
          if (Either.isLeft(decoded)) {
            expect(Either.isRight(decoded)).toBe(true)
            return
          }
          expect(decoded.right).toEqual({ version: 1, prompts: listed })
          expect(listed.map((prompt) => prompt.id)).toEqual(["a", "b"])
        }),
      ),
    )
  })

  it.layer(seededLayer([localPrompt]))("import", (it) => {
    it.effect(
      "puts in file order, keeps a local id, and does not draft or touch",
      () => {
        const tape = recordDeps()
        const first = libraryPrompt("first", "First", {
          body: "Hello {name}",
          favorite: false,
          updatedAt: 3,
          lastUsedAt: 4,
        })
        const second = libraryPrompt("second", "Second", {
          body: "Next {name}",
          favorite: true,
          updatedAt: 8,
        })
        return runLibrary(tape.deps, (vm) =>
          Effect.gen(function* () {
            yield* vm.open()
            yield* vm.importLibraryText(libraryText([first, second]))
            expect(vm.isOpen()).toBe(true)
            expect(vm.mode()).toBe("browse")
            expect(vm.actionError()).toBeUndefined()
            expect(tape.drafts).toEqual([])
            expect(tape.focused()).toBe(0)
            expect(vm.prompts().map((prompt) => prompt.id)).toEqual([
              "local",
              "first",
              "second",
            ])
            expect(vm.prompts()[1]).toEqual(first)
            expect(vm.prompts()[2]).toEqual(second)
            expect(vm.prompts()[0]).toEqual(localPrompt)
          }),
        )
      },
    )
  })

  it.layer(seededLayer([localPrompt]))("rejected import", (it) => {
    it.effect("rejects a bad version or a bad prompt with zero puts", () =>
      runLibrary(idleDeps(), (vm) =>
        Effect.gen(function* () {
          yield* vm.open()
          const library = yield* PromptLibrary
          const before = yield* library.getAll()
          yield* vm.importLibraryText(
            libraryText([libraryPrompt("new", "New")], "1"),
          )
          expect(vm.actionError()).toBe(notPromptLibraryText)
          expect(yield* library.getAll()).toEqual(before)
          yield* vm.importLibraryText(
            libraryText([
              libraryPrompt("also-new", "Also"),
              { id: "bad", title: "" },
            ]),
          )
          expect(vm.actionError()).toBe(notPromptLibraryText)
          expect(yield* library.getAll()).toEqual(before)
          expect(vm.prompts().map((prompt) => prompt.id)).toEqual(["local"])
          yield* vm.importLibraryText("{")
          expect(vm.actionError()).toBe(notPromptLibraryText)
          expect(yield* library.getAll()).toEqual(before)
        }),
      ),
    )
  })

  it.layer(memoryLayer())("unreadable import", (it) => {
    it.effect("reports a file that could not be read", () =>
      runLibrary(idleDeps(), (vm) =>
        Effect.gen(function* () {
          vm.failImportRead()
          expect(vm.actionError()).toBe(couldNotReadFileText)
          expect(vm.prompts()).toEqual([])
        }),
      ),
    )
  })

  it.layer(memoryLayer())("duplicate ids", (it) => {
    it.effect("keeps the later record", () =>
      runLibrary(idleDeps(), (vm) =>
        Effect.gen(function* () {
          const earlier = libraryPrompt("same", "Earlier", {
            favorite: false,
            updatedAt: 2,
          })
          const later = libraryPrompt("same", "Later", {
            body: "Later {name}",
            favorite: true,
            updatedAt: 9,
            lastUsedAt: 4,
          })
          yield* vm.importLibraryText(libraryText([earlier, later]))
          const library = yield* PromptLibrary
          const stored = yield* library.get("same")
          if (Option.isNone(stored)) {
            expect(Option.isSome(stored)).toBe(true)
            return
          }
          const decoded = decodePrompt(stored.value)
          if (Either.isLeft(decoded)) {
            expect(Either.isRight(decoded)).toBe(true)
            return
          }
          expect(decoded.right).toEqual(later)
          expect(vm.prompts().map((prompt) => prompt.title)).toEqual(["Later"])
        }),
      ),
    )
  })

  it.layer(unavailableLibraryLayer)("export read failure", (it) => {
    it.effect("fails with the load sentence", () =>
      runLibrary(idleDeps(), (vm) =>
        Effect.gen(function* () {
          const json = yield* vm.exportLibrary()
          expect(json).toBeUndefined()
          expect(vm.loadError()).toBe(couldNotLoadPrompts)
          expect(vm.pendingExport()).toBeUndefined()
        }),
      ),
    )
  })
})
