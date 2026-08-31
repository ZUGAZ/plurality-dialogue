import { Effect } from "effect"
import { ComposerNotWritable } from "../../domain/ports/provider-page"

export const insertComposerText = (
  element: Element,
  text: string,
): Effect.Effect<void, ComposerNotWritable> =>
  Effect.suspend(() => {
    if (!(element instanceof HTMLElement) || !isWritableComposer(element)) {
      return Effect.fail(
        new ComposerNotWritable({ reason: "composer is not writable" }),
      )
    }
    const target = element
    return Effect.sync(() => {
      writeComposerText(target, text)
    })
  })

const isWritableComposer = (element: HTMLElement): boolean => {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    return !element.readOnly && !element.disabled
  }
  return element.isContentEditable
}

const writeComposerText = (element: HTMLElement, text: string): void => {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    writePlainValue(element, text)
    return
  }
  writeContentEditable(element, text)
}

const writePlainValue = (
  element: HTMLTextAreaElement | HTMLInputElement,
  text: string,
): void => {
  element.focus()
  element.value = text
  element.dispatchEvent(new Event("input", { bubbles: true }))
  element.setSelectionRange(text.length, text.length)
}

const writeContentEditable = (element: HTMLElement, text: string): void => {
  element.focus()
  selectAllInside(element)
  const inserted = execInsertText(element.ownerDocument, text)
  if (!inserted) {
    dispatchInsertEvents(element, text)
  }
  if (element.textContent !== text) {
    element.textContent = text
    element.dispatchEvent(new Event("input", { bubbles: true }))
  }
}

const execInsertText = (doc: Document, text: string): boolean => {
  if (typeof doc.execCommand !== "function") {
    return false
  }
  return doc.execCommand("insertText", false, text)
}

const selectAllInside = (element: HTMLElement): void => {
  const selection = element.ownerDocument.defaultView?.getSelection()
  if (selection === undefined || selection === null) {
    return
  }
  selection.selectAllChildren(element)
}

const dispatchInsertEvents = (element: HTMLElement, text: string): void => {
  element.dispatchEvent(
    new InputEvent("beforeinput", {
      bubbles: true,
      cancelable: true,
      inputType: "insertText",
      data: text,
    }),
  )
  element.dispatchEvent(
    new InputEvent("input", {
      bubbles: true,
      inputType: "insertText",
      data: text,
    }),
  )
}
