const lineTags: ReadonlySet<string> = new Set(["DIV", "P"])

export const composerHoldsText = (element: HTMLElement, text: string): boolean =>
  normalizedComposerText(readComposerText(element)) ===
  normalizedComposerText(text)

const normalizedComposerText = (value: string): string =>
  value.replace(/\r\n/g, "\n").replace(/\u00a0/g, " ").replace(/\n+/g, "\n").trim()

const readComposerText = (element: HTMLElement): string => {
  const children = [...element.childNodes].filter((node) => !isSkippable(node))
  const lines = children.filter(isLineElement)
  if (lines.length > 0 && lines.length === children.length) {
    return lines.map((line) => readComposerText(line)).join("\n")
  }
  const inline = inlineText(element)
  if (inline.replace(/\n/g, "").trim() === "") {
    return ""
  }
  return inline
}

const isSkippable = (node: Node): boolean => {
  if (node instanceof Text) {
    return node.data.trim() === ""
  }
  return !(node instanceof HTMLElement)
}

const isLineElement = (node: Node): node is HTMLElement =>
  node instanceof HTMLElement && lineTags.has(node.tagName)

const inlineText = (element: HTMLElement): string => {
  let value = ""
  for (const node of element.childNodes) {
    if (node instanceof HTMLBRElement) {
      value += "\n"
      continue
    }
    if (node instanceof Text) {
      value += node.data
      continue
    }
    if (node instanceof HTMLElement) {
      value += inlineText(node)
    }
  }
  return value
}
