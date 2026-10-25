export const isDisplayedHtmlElement = (el: Element): el is HTMLElement => {
  if (!(el instanceof HTMLElement) || !el.isConnected) {
    return false
  }
  const view = el.ownerDocument.defaultView
  if (view === null) {
    return true
  }
  const style = view.getComputedStyle(el)
  return style.display !== "none" && style.visibility !== "hidden"
}

export const composerContaining = (
  root: ParentNode,
  selectors: readonly string[],
  target: EventTarget | null,
): HTMLElement | null => {
  if (!(target instanceof Node)) {
    return null
  }
  for (const selector of selectors) {
    const match = displayedContainer(root, selector, target)
    if (match !== null) {
      return match
    }
  }
  return null
}

const displayedContainer = (
  root: ParentNode,
  selector: string,
  target: Node,
): HTMLElement | null => {
  const matches = root.querySelectorAll(selector)
  for (const match of matches) {
    if (!isDisplayedHtmlElement(match)) {
      continue
    }
    if (match === target || match.contains(target)) {
      return match
    }
  }
  return null
}

export const firstDisplayed = (
  root: ParentNode,
  selectors: readonly string[],
): HTMLElement | null => {
  for (const selector of selectors) {
    const matches = root.querySelectorAll(selector)
    for (const match of matches) {
      if (isDisplayedHtmlElement(match)) {
        return match
      }
    }
  }
  return null
}

export const lastDisplayed = (
  root: ParentNode,
  selectors: readonly string[],
): HTMLElement | null => {
  for (const selector of selectors) {
    const matches = root.querySelectorAll(selector)
    let last: HTMLElement | null = null
    for (const match of matches) {
      if (isDisplayedHtmlElement(match)) {
        last = match
      }
    }
    if (last !== null) {
      return last
    }
  }
  return null
}
