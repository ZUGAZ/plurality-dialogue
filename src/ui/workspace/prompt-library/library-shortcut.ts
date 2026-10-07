export const setupLibraryShortcut = (toggle: () => void): (() => void) => {
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.isComposing || event.keyCode === 229 || event.repeat) {
      return
    }
    if (!isLibraryShortcut(event)) {
      return
    }
    event.preventDefault()
    toggle()
  }

  document.addEventListener("keydown", onKeyDown)
  return () => {
    document.removeEventListener("keydown", onKeyDown)
  }
}

const isLibraryShortcut = (event: KeyboardEvent): boolean => {
  if (event.key.toLowerCase() !== "l" || !event.shiftKey || event.altKey) {
    return false
  }
  return event.ctrlKey || event.metaKey
}
