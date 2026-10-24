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

  it.effect("keeps a blank line when paste is ignored", () =>
    Effect.gen(function* () {
      const editor = paragraphEditor()
      yield* insertComposerText(editor, rolePrompt)
      expect(editor.textContent).toBe(rolePrompt)
      expect(editor.querySelectorAll("p")).toHaveLength(1)
      editor.remove()
    }),
  )

  it.effect("does not write the prompt again after paste splits lines", () =>
    Effect.gen(function* () {
      const editor = paragraphEditor()
      const writes = countFallbackWrites(editor)
      installLinePaste(editor, "p", true)
      yield* insertComposerText(editor, rolePrompt)
      expect(paragraphLines(editor)).toEqual([instruction, "", prompt])
      expect(writes()).toBe(0)
      editor.remove()
    }),
  )

  it.effect("does not write the prompt again when paste drops the empty line", () =>
    Effect.gen(function* () {
      const editor = paragraphEditor()
      const writes = countFallbackWrites(editor)
      installLinePaste(editor, "p", false)
      yield* insertComposerText(editor, rolePrompt)
      expect(paragraphLines(editor)).toEqual([instruction, prompt])
      expect(writes()).toBe(0)
      editor.remove()
    }),
  )

  it.effect("does not write the prompt again when paste splits div lines", () =>
    Effect.gen(function* () {
      const editor = paragraphEditor()
      const writes = countFallbackWrites(editor)
      installLinePaste(editor, "div", true)
      yield* insertComposerText(editor, rolePrompt)
      expect(paragraphLines(editor)).toEqual([instruction, "", prompt])
      expect(writes()).toBe(0)
      editor.remove()
    }),
  )

  it.effect("does not write the prompt again when paste uses breaks", () =>
    Effect.gen(function* () {
      const editor = paragraphEditor()
      const writes = countFallbackWrites(editor)
      installBreakPaste(editor)
      yield* insertComposerText(editor, rolePrompt)
      expect(editor.querySelectorAll("br")).toHaveLength(2)
      expect(occurrences(editor.textContent ?? "", prompt)).toBe(1)
      expect(writes()).toBe(0)
      editor.remove()
    }),
  )
})

const instruction =
  "Give the strongest fair version of the idea, then the best argument for it."

const prompt =
  "Whose drones attached ships in bulgarian waters in october 2026? Be very concise."

const rolePrompt = `${instruction}\n\n${prompt}`

const paragraphEditor = (): HTMLDivElement => {
  const editor = document.createElement("div")
  editor.contentEditable = "true"
  const paragraph = document.createElement("p")
  paragraph.append(document.createElement("br"))
  editor.append(paragraph)
  document.body.append(editor)
  return editor
}

const paragraphLines = (editor: HTMLElement): string[] =>
  [...editor.children].map((child) => child.textContent ?? "")

const installLinePaste = (
  editor: HTMLElement,
  tag: "p" | "div",
  keepEmptyLines: boolean,
): void => {
  onPlainPaste(editor, (pasted) => {
    const lines = keepEmptyLines
      ? pasted.split("\n")
      : pasted.split("\n").filter((line) => line !== "")
    const blocks = lines.map((line) => {
      const block = document.createElement(tag)
      block.textContent = line
      return block
    })
    editor.replaceChildren(...blocks)
  })
}

const installBreakPaste = (editor: HTMLElement): void => {
  onPlainPaste(editor, (pasted) => {
    const paragraph = document.createElement("p")
    for (const [index, line] of pasted.split("\n").entries()) {
      if (index > 0) {
        paragraph.append(document.createElement("br"))
      }
      paragraph.append(line)
    }
    editor.replaceChildren(paragraph)
  })
}

const onPlainPaste = (
  editor: HTMLElement,
  apply: (pasted: string) => void,
): void => {
  editor.addEventListener("paste", (event) => {
    const pasted = event.clipboardData?.getData("text/plain")
    if (pasted === undefined || pasted === "") {
      return
    }
    event.preventDefault()
    apply(pasted)
  })
}

const occurrences = (value: string, needle: string): number =>
  value.split(needle).length - 1

const countFallbackWrites = (editor: HTMLElement): (() => number) => {
  let writes = 0
  editor.addEventListener("beforeinput", (event) => {
    if (!(event instanceof InputEvent) || event.inputType !== "insertText") {
      return
    }
    writes += 1
  })
  return () => writes
}
