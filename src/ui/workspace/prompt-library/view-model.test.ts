// @vitest-environment happy-dom
import { Effect } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { listPrompts } from "@domain/prompt/prompt-crud"
import {
  couldNotLoadPrompts,
  promptGoneText,
  titleRequiredText,
} from "./model"
import {
  idleDeps,
  memoryLayer,
  onlyPrompt,
  promptTitles,
  recordDeps,
  runLibrary,
  saveNewPrompt,
  seededLayer,
  unavailableLibraryLayer,
  visibleFromQuery,
  visibleTitles,
} from "./view-model-harness"

const seeded = {
  id: "seed",
  title: "Seed",
  body: "Hello {name}",
  tags: ["work"],
  favorite: false,
  createdAt: 1,
  updatedAt: 2,
}

describe("prompt library view-model", () => {
  it.layer(memoryLayer())("empty library", (it) => {
    it.effect("opens, closes, and toggles", () =>
      runLibrary(idleDeps(), (vm) =>
        Effect.gen(function* () {
          expect(vm.isOpen()).toBe(false)
          yield* vm.open()
          expect(vm.isOpen()).toBe(true)
          expect(vm.prompts()).toEqual([])
          expect(vm.visiblePrompts()).toEqual([])
          expect(vm.loadError()).toBeUndefined()
          yield* vm.close()
          expect(vm.isOpen()).toBe(false)
          yield* vm.toggle()
          expect(vm.isOpen()).toBe(true)
          yield* vm.toggle()
          expect(vm.isOpen()).toBe(false)
        }),
      ),
    )
  })

  it.layer(seededLayer([seeded]))("stored prompt", (it) => {
    it.effect("loads on open", () =>
      runLibrary(idleDeps(), (vm) =>
        Effect.gen(function* () {
          yield* vm.open()
          expect(promptTitles(vm)).toEqual(["Seed"])
        }),
      ),
    )
  })

  it.layer(memoryLayer())("create", (it) => {
    it.effect("refreshes and returns to browse", () =>
      runLibrary(idleDeps(), (vm) =>
        Effect.gen(function* () {
          yield* vm.open()
          vm.startCreate()
          vm.setEditorTitle("  Hello  ")
          vm.setEditorBody("Body {x}")
          vm.setEditorTags("a, b")
          yield* vm.save()
          expect(vm.mode()).toBe("browse")
          expect(promptTitles(vm)).toEqual(["Hello"])
          expect(vm.prompts().map((prompt) => prompt.body)).toEqual([
            "Body {x}",
          ])
          expect(vm.prompts().map((prompt) => prompt.tags)).toEqual([
            ["a", "b"],
          ])
        }),
      ),
    )
  })

  it.layer(memoryLayer())("blank title", (it) => {
    it.effect("asks for a title and does not create", () =>
      runLibrary(idleDeps(), (vm) =>
        Effect.gen(function* () {
          yield* vm.open()
          vm.startCreate()
          vm.setEditorTitle("   ")
          yield* vm.save()
          expect(vm.actionError()).toBe(titleRequiredText)
          expect(vm.mode()).toBe("edit")
          expect(vm.prompts()).toEqual([])
        }),
      ),
    )
  })

  it.layer(memoryLayer())("edit and delete", (it) => {
    it.effect("updates, then delete refreshes browse", () =>
      runLibrary(idleDeps(), (vm) =>
        Effect.gen(function* () {
          yield* vm.open()
          yield* saveNewPrompt(vm, "Original", "old")
          vm.startEdit(onlyPrompt(vm))
          vm.setEditorTitle("Renamed")
          yield* vm.save()
          expect(vm.mode()).toBe("browse")
          expect(promptTitles(vm)).toEqual(["Renamed"])
          vm.startEdit(onlyPrompt(vm))
          yield* vm.remove()
          expect(vm.mode()).toBe("browse")
          expect(vm.isOpen()).toBe(true)
          expect(vm.prompts()).toEqual([])
        }),
      ),
    )
  })

  it.layer(memoryLayer())("filters", (it) => {
    it.effect("shows queryPrompts over the loaded list", () =>
      runLibrary(idleDeps(), (vm) =>
        Effect.gen(function* () {
          yield* vm.open()
          yield* saveNewPrompt(vm, "Alpha", "cats", "work")
          yield* saveNewPrompt(vm, "Beta", "dogs", "home")
          const beta = vm.prompts().find((prompt) => prompt.title === "Beta")
          if (beta === undefined) {
            expect(beta).toBeDefined()
            return
          }
          yield* vm.setFavorite(beta.id, true)
          vm.setSearch("cat")
          expect(vm.visiblePrompts()).toEqual(visibleFromQuery(vm))
          expect(visibleTitles(vm)).toEqual(["Alpha"])
          vm.setSearch("")
          vm.setTag("home")
          expect(vm.visiblePrompts()).toEqual(visibleFromQuery(vm))
          expect(visibleTitles(vm)).toEqual(["Beta"])
          vm.setTag("")
          vm.setFavoritesOnly(true)
          expect(vm.visiblePrompts()).toEqual(visibleFromQuery(vm))
          expect(visibleTitles(vm)).toEqual(["Beta"])
          vm.setFavoritesOnly(false)
          vm.setSort("title")
          expect(vm.visiblePrompts()).toEqual(visibleFromQuery(vm))
          expect(visibleTitles(vm)).toEqual(["Alpha", "Beta"])
        }),
      ),
    )
  })

  it.layer(memoryLayer())("apply", (it) => {
    it.effect("replaces the draft with the raw body, touches, and closes", () =>
      Effect.gen(function* () {
        const tape = recordDeps()
        yield* runLibrary(tape.deps, (vm) =>
          Effect.gen(function* () {
            yield* vm.open()
            yield* saveNewPrompt(vm, "Greeting", "Hello there")
            yield* vm.applyPrompt(onlyPrompt(vm))
            yield* Effect.promise(() => Promise.resolve())
            expect(tape.drafts).toEqual(["Hello there"])
            expect(vm.isOpen()).toBe(false)
            expect(tape.focused()).toBe(1)
            const stored = yield* listPrompts()
            expect(
              stored.map((item) => item.lastUsedAt !== undefined),
            ).toEqual([true])
          }),
        )
      }),
    )
  })

  it.layer(memoryLayer())("missing prompt", (it) => {
    it.effect("keeps the modal open and says it is gone", () =>
      runLibrary(idleDeps(), (vm) =>
        Effect.gen(function* () {
          yield* vm.open()
          yield* vm.setFavorite("missing", true)
          expect(vm.actionError()).toBe(promptGoneText)
          expect(vm.isOpen()).toBe(true)
        }),
      ),
    )
  })

  it.layer(unavailableLibraryLayer)("read failure", (it) => {
    it.effect("shows the load sentence and stays open", () =>
      runLibrary(idleDeps(), (vm) =>
        Effect.gen(function* () {
          yield* vm.open()
          expect(vm.loadError()).toBe(couldNotLoadPrompts)
          expect(vm.isOpen()).toBe(true)
        }),
      ),
    )
  })
})
