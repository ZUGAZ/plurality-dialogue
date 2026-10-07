// @vitest-environment happy-dom
import { Effect } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { insertComposerText } from "./insert-composer-text"

describe("insertComposerText", () => {
  it.effect("replaces contenteditable text instead of appending", () =>
    Effect.gen(function* () {
      const editor = document.createElement("div")
      editor.contentEditable = "true"
      editor.textContent = "old"
      document.body.append(editor)
      yield* insertComposerText(editor, "ZXQ-FILL-PROBE-9182")
      expect(editor.textContent).toBe("ZXQ-FILL-PROBE-9182")
      expect(editor.textContent?.includes("old")).toBe(false)
      editor.remove()
    }),
  )

  it.effect("replaces textarea value instead of appending", () =>
    Effect.gen(function* () {
      const editor = document.createElement("textarea")
      editor.value = "old"
      document.body.append(editor)
      yield* insertComposerText(editor, "ZXQ-FILL-PROBE-9182")
      expect(editor.value).toBe("ZXQ-FILL-PROBE-9182")
      editor.remove()
    }),
  )

  it.effect("writes into the paragraph and keeps it", () =>
    Effect.gen(function* () {
      const editor = document.createElement("div")
      editor.contentEditable = "true"
      const paragraph = document.createElement("p")
      paragraph.textContent = "old"
      editor.append(paragraph)
      document.body.append(editor)
      yield* insertComposerText(editor, "ZXQ-FILL-PROBE-9182")
      expect(editor.querySelector("p")?.textContent).toBe("ZXQ-FILL-PROBE-9182")
      expect(editor.querySelectorAll("p")).toHaveLength(1)
      editor.remove()
    }),
  )
})
