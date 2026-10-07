// @vitest-environment happy-dom
import { Effect } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { listPrompts } from "@domain/prompt/prompt-crud"
import type { ListedPrompt } from "./model"
import {
  memoryLayer,
  onlyPrompt,
  recordDeps,
  runLibrary,
  saveNewPrompt,
} from "./view-model-harness"

describe("prompt library view-model", () => {
  it.layer(memoryLayer())("fill", (it) => {
    it.effect("apply, cancel, and escape leave the draft untouched", () => {
      const tape = recordDeps()
      return runLibrary(tape.deps, (vm) =>
        Effect.gen(function* () {
          yield* vm.open()
          yield* saveNewPrompt(vm, "Topic", "Explain {topic}")
          const prompt = onlyPrompt(vm)
          yield* vm.applyPrompt(prompt)
          expect(tape.drafts).toEqual([])
          expect(vm.mode()).toBe("fill")
          expect(vm.isOpen()).toBe(true)
          expect(vm.fillTitle()).toBe("Topic")
          expect(vm.fillNames()).toEqual(["topic"])
          vm.cancelFill()
          expect(vm.mode()).toBe("browse")
          expect(vm.isOpen()).toBe(true)
          yield* vm.applyPrompt(prompt)
          yield* vm.close()
          expect(vm.isOpen()).toBe(false)
          expect(vm.mode()).toBe("fill")
          expect(tape.drafts).toEqual([])
          const stored = yield* listPrompts()
          expect(stored.map((item) => item.lastUsedAt)).toEqual([undefined])
        }),
      )
    })
  })

  it.layer(memoryLayer())("insert", (it) => {
    it.effect("writes the substituted body, then touches, closes, and focuses", () => {
      const tape = recordDeps()
      return runLibrary(tape.deps, (vm) =>
        Effect.gen(function* () {
          yield* vm.open()
          yield* saveNewPrompt(vm, "Topic", "{topic} and {topic}")
          yield* vm.applyPrompt(onlyPrompt(vm))
          expect(vm.fillNames()).toEqual(["topic"])
          vm.setFillValue("topic", "birds")
          yield* vm.insertFill()
          yield* Effect.promise(() => Promise.resolve())
          expect(tape.drafts).toEqual(["birds and birds"])
          expect(vm.isOpen()).toBe(false)
          expect(tape.focused()).toBe(1)
          const stored = yield* listPrompts()
          expect(stored.map((item) => item.lastUsedAt !== undefined)).toEqual([
            true,
          ])
        }),
      )
    })
  })

  it.layer(memoryLayer())("touch failure", (it) => {
    it.effect("keeps the substituted draft when touch fails after insert", () => {
      const tape = recordDeps()
      const missing: ListedPrompt = {
        id: "missing",
        title: "Gone",
        body: "Keep {topic}",
        tags: [],
        favorite: false,
      }
      return runLibrary(tape.deps, (vm) =>
        Effect.gen(function* () {
          yield* vm.open()
          yield* vm.applyPrompt(missing)
          expect(tape.drafts).toEqual([])
          vm.setFillValue("topic", "this")
          yield* vm.insertFill()
          yield* Effect.promise(() => Promise.resolve())
          expect(tape.drafts).toEqual(["Keep this"])
          expect(vm.isOpen()).toBe(false)
          expect(tape.focused()).toBe(1)
        }),
      )
    })
  })
})
