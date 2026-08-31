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

export const firstDisplayed = (
  root: ParentNode,
  selectors: readonly string[],
): HTMLElement | null => {
  for (const selector of selectors) {
    const match = root.querySelector(selector)
    if (match !== null && isDisplayedHtmlElement(match)) {
      return match
    }
  }
  return null
}
