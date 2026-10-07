// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "@effect/vitest"
import { setupLibraryShortcut } from "./library-shortcut"

describe("library shortcut", () => {
  const stops: Array<() => void> = []

  afterEach(() => {
    for (const stop of stops) {
      stop()
    }
    stops.length = 0
  })

  const start = () => {
    let toggles = 0
    stops.push(
      setupLibraryShortcut(() => {
        toggles += 1
      }),
    )
    return () => toggles
  }

  it("toggles and prevents the default for ctrl and cmd", () => {
    const toggles = start()
    const ctrl = press({ key: "L", ctrlKey: true, shiftKey: true })
    const cmd = press({ key: "l", metaKey: true, shiftKey: true })
    expect(ctrl.defaultPrevented).toBe(true)
    expect(cmd.defaultPrevented).toBe(true)
    expect(toggles()).toBe(2)
  })

  it("ignores composition and the legacy ime code", () => {
    const toggles = start()
    const composing = press({
      key: "L",
      ctrlKey: true,
      shiftKey: true,
      isComposing: true,
    })
    const ime = press({ key: "L", ctrlKey: true, shiftKey: true }, 229)
    expect(composing.defaultPrevented).toBe(false)
    expect(ime.defaultPrevented).toBe(false)
    expect(toggles()).toBe(0)
  })

  it("ignores plain l and a held repeat", () => {
    const toggles = start()
    press({ key: "l" })
    press({ key: "L", shiftKey: true })
    press({ key: "L", ctrlKey: true, shiftKey: true, repeat: true })
    expect(toggles()).toBe(0)
  })

  it("drops the listener on cleanup", () => {
    let toggles = 0
    const stop = setupLibraryShortcut(() => {
      toggles += 1
    })
    stop()
    press({ key: "L", ctrlKey: true, shiftKey: true })
    expect(toggles).toBe(0)
  })
})

const press = (
  init: KeyboardEventInit,
  keyCode?: number,
): KeyboardEvent => {
  const event = new KeyboardEvent("keydown", { ...init, cancelable: true })
  if (keyCode !== undefined) {
    Object.defineProperty(event, "keyCode", { value: keyCode })
  }
  document.dispatchEvent(event)
  return event
}
