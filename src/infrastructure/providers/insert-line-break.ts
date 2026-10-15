import { Either } from "effect"
import { ComposerNotWritable } from "../../domain/ports/provider-page"

export const insertLineBreak = (
  element: Element,
): Either.Either<void, ComposerNotWritable> => {
  if (
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLInputElement
  ) {
    if (element.readOnly || element.disabled) {
      return notWritable()
    }
    return writePlainBreak(element)
  }
  if (!(element instanceof HTMLElement) || !element.isContentEditable) {
    return notWritable()
  }
  if (!insertContentEditableBreak(element)) {
    return notWritable()
  }
  return Either.right(undefined)
}

const notWritable = (): Either.Either<void, ComposerNotWritable> =>
  Either.left(new ComposerNotWritable({ reason: "composer is not writable" }))

const writePlainBreak = (
  element: HTMLTextAreaElement | HTMLInputElement,
): Either.Either<void, ComposerNotWritable> => {
  const start = element.selectionStart ?? element.value.length
  const end = element.selectionEnd ?? start
  try {
    element.setRangeText("\n", start, end, "end")
  } catch {
    return notWritable()
  }
  element.dispatchEvent(new Event("input", { bubbles: true }))
  return Either.right(undefined)
}

type CaretSides = {
  readonly before: string
  readonly after: string
}

type Piece =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "break" }

const insertContentEditableBreak = (element: HTMLElement): boolean => {
  try {
    const saved = caretRange(element)
    const sides = saved === null ? null : sidesOf(element, saved)
    element.focus()
    if (saved !== null) {
      selectRange(element, saved)
    }
    const commanded = execInsertLineBreak(element.ownerDocument)
    if (commanded && sides !== null && breakSeparates(element, sides)) {
      return true
    }
    insertBr(element, liveRange(element, saved))
    return true
  } catch {
    return false
  }
}

const execInsertLineBreak = (doc: Document): boolean => {
  if (typeof doc.execCommand !== "function") {
    return false
  }
  try {
    return doc.execCommand("insertLineBreak", false)
  } catch {
    return false
  }
}

const caretRange = (element: HTMLElement): Range | null => {
  const selection = element.ownerDocument.defaultView?.getSelection() ?? null
  if (selection === null || selection.rangeCount === 0) {
    return null
  }
  const range = selection.getRangeAt(0)
  if (!element.contains(range.startContainer)) {
    return null
  }
  return range.cloneRange()
}

const sidesOf = (element: HTMLElement, range: Range): CaretSides => {
  const beforeRange = range.cloneRange()
  beforeRange.selectNodeContents(element)
  beforeRange.setEnd(range.startContainer, range.startOffset)
  const afterRange = range.cloneRange()
  afterRange.selectNodeContents(element)
  afterRange.setStart(range.endContainer, range.endOffset)
  return { before: beforeRange.toString(), after: afterRange.toString() }
}

const selectRange = (element: HTMLElement, range: Range): void => {
  const selection = element.ownerDocument.defaultView?.getSelection() ?? null
  if (selection === null) {
    return
  }
  selection.removeAllRanges()
  selection.addRange(range)
}

const breakSeparates = (element: HTMLElement, sides: CaretSides): boolean => {
  const pieces = piecesOf(element)
  let before = ""
  for (let index = 0; index < pieces.length; index += 1) {
    const piece = pieces[index]
    if (piece === undefined) {
      continue
    }
    if (piece.kind === "text") {
      before += piece.text
      continue
    }
    if (
      before === sides.before &&
      textFrom(pieces, index + 1) === sides.after
    ) {
      return true
    }
  }
  return false
}

const piecesOf = (element: HTMLElement): readonly Piece[] => {
  const pieces: Array<Piece> = []
  const walk = (node: Node): void => {
    if (node instanceof HTMLBRElement) {
      pieces.push({ kind: "break" })
      return
    }
    if (node instanceof Text) {
      pieces.push({ kind: "text", text: node.data })
      return
    }
    for (const child of node.childNodes) {
      walk(child)
    }
  }
  walk(element)
  return pieces
}

const textFrom = (pieces: readonly Piece[], start: number): string => {
  let text = ""
  for (let index = start; index < pieces.length; index += 1) {
    const piece = pieces[index]
    if (piece !== undefined && piece.kind === "text") {
      text += piece.text
    }
  }
  return text
}

const liveRange = (element: HTMLElement, saved: Range | null): Range => {
  const current = caretRange(element)
  if (current !== null) {
    return current
  }
  if (saved !== null && saved.startContainer.isConnected) {
    return saved
  }
  return endRange(element)
}

const endRange = (element: HTMLElement): Range => {
  const range = element.ownerDocument.createRange()
  range.selectNodeContents(element)
  range.collapse(false)
  return range
}

const insertBr = (element: HTMLElement, range: Range): void => {
  range.deleteContents()
  const br = element.ownerDocument.createElement("br")
  range.insertNode(br)
  const caret = element.ownerDocument.createRange()
  caret.setStartAfter(br)
  caret.collapse(true)
  selectRange(element, caret)
  element.dispatchEvent(new Event("input", { bubbles: true }))
}
