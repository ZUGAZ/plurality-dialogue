// Vendor pages focus their composer after load. A pointer event in the grid
// means the user wants that frame; only an unsolicited focusin returns here.
// Fill and Send also focus that composer on purpose. holdFocusGuard covers
// that window so the guard does not yank the caret mid-insert.
const clickWindowMs = 500

let holds = 0

export const holdFocusGuard = (): void => {
  holds += 1
}

export const releaseFocusGuard = (): void => {
  if (holds > 0) {
    holds -= 1
  }
}

export const focusGuardHeld = (): boolean => holds > 0

export const setupFocusGuard = (
  focusPrompt: () => void,
  gridSelector: string,
): (() => void) => {
  let userClicked = false
  let clickResetTimer: ReturnType<typeof setTimeout> | undefined

  const onPointerDown = (): void => {
    userClicked = true
    clearTimeout(clickResetTimer)
    clickResetTimer = setTimeout(() => {
      userClicked = false
    }, clickWindowMs)
  }

  const onPointerUp = (): void => {
    clearTimeout(clickResetTimer)
    // focusin is dispatched before pointerup; drop the flag on the next turn.
    clickResetTimer = setTimeout(() => {
      userClicked = false
    }, 0)
  }

  const onFocusIn = (event: FocusEvent): void => {
    if (focusGuardHeld()) {
      return
    }
    if (!userClicked && event.target instanceof HTMLIFrameElement) {
      focusPrompt()
    }
  }

  document.addEventListener("focusin", onFocusIn)
  const grid = document.querySelector(gridSelector)
  grid?.addEventListener("pointerdown", onPointerDown)
  grid?.addEventListener("pointerup", onPointerUp)

  return () => {
    document.removeEventListener("focusin", onFocusIn)
    grid?.removeEventListener("pointerdown", onPointerDown)
    grid?.removeEventListener("pointerup", onPointerUp)
    clearTimeout(clickResetTimer)
  }
}
