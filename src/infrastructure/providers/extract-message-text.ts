export const readVisibleText = (element: HTMLElement): string => {
  const rendered = element.innerText
  const stored = element.textContent ?? ""
  return collapseWhitespace(preferStoredSpacing(rendered, stored))
}

// happy-dom drops the first newline in innerText and glues two words together.
// When the non-space characters match textContent, keep the spacing textContent kept.
const preferStoredSpacing = (rendered: string, stored: string): string => {
  if (rendered.replace(/\s+/g, "") !== stored.replace(/\s+/g, "")) {
    return rendered
  }
  const collapsedRendered = collapseWhitespace(rendered)
  const collapsedStored = collapseWhitespace(stored)
  return collapsedStored.length > collapsedRendered.length
    ? stored
    : rendered
}

const collapseWhitespace = (text: string): string => text.replace(/\s+/g, " ").trim()
