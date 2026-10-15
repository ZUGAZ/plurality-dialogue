// @vitest-environment happy-dom
import { Either } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { ComposerNotWritable } from "../../domain/ports/provider-page"
import { insertLineBreak } from "./insert-line-break"

describe("insertLineBreak", () => {
  it("inserts a newline in a textarea at the caret", () => {
    const textarea = document.createElement("textarea")
    textarea.value = "ab"
    textarea.setSelectionRange(1, 1)
    document.body.append(textarea)
    const result = insertLineBreak(textarea)
    expect(Either.isRight(result)).toBe(true)
    expect(textarea.value).toBe("a\nb")
    textarea.remove()
  })

  it("inserts a br between the letters of a contenteditable", () => {
    const editor = document.createElement("div")
    editor.contentEditable = "true"
    editor.textContent = "ab"
    document.body.append(editor)
    const text = editor.firstChild
    expect(text).toBeInstanceOf(Text)
    if (text instanceof Text) {
      const range = document.createRange()
      range.setStart(text, 1)
      range.collapse(true)
      const selection = document.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
    const result = insertLineBreak(editor)
    expect(Either.isRight(result)).toBe(true)
    const br = editor.querySelector("br")
    expect(br?.previousSibling?.textContent).toBe("a")
    expect(br?.nextSibling?.textContent).toBe("b")
    editor.remove()
  })

  it("returns ComposerNotWritable for a plain div", () => {
    const div = document.createElement("div")
    document.body.append(div)
    const result = insertLineBreak(div)
    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(ComposerNotWritable)
    }
    div.remove()
  })
})
