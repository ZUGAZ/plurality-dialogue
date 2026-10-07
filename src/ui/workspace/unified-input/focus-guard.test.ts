// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  focusGuardHeld,
  holdFocusGuard,
  releaseFocusGuard,
  setupFocusGuard,
} from "./focus-guard"

const gridSelector = '[data-workspace="panel-grid"]'

describe("focus guard", () => {
  const stops: Array<() => void> = []

  afterEach(() => {
    for (const stop of stops) {
      stop()
    }
    stops.length = 0
    document.body.replaceChildren()
    vi.useRealTimers()
    while (focusGuardHeld()) {
      releaseFocusGuard()
    }
  })

  const mountGrid = () => {
    const grid = document.createElement("div")
    grid.setAttribute("data-workspace", "panel-grid")
    const iframe = document.createElement("iframe")
    const button = document.createElement("button")
    grid.append(iframe, button)
    document.body.append(grid)
    return { grid, iframe, button }
  }

  const start = () => {
    const focusPrompt = vi.fn()
    stops.push(setupFocusGuard(focusPrompt, gridSelector))
    return focusPrompt
  }

  it("returns focus when an iframe takes it without a click", () => {
    const { iframe } = mountGrid()
    const focusPrompt = start()
    focusIn(iframe)
    expect(focusPrompt).toHaveBeenCalledTimes(1)
  })

  it("leaves an iframe focused after a pointer down on the grid", () => {
    const { grid, iframe } = mountGrid()
    const focusPrompt = start()
    pointer(grid, "pointerdown")
    focusIn(iframe)
    expect(focusPrompt).not.toHaveBeenCalled()
  })

  it("leaves an iframe focused when the pointer down is on the frame", () => {
    const { iframe } = mountGrid()
    const focusPrompt = start()
    pointer(iframe, "pointerdown")
    focusIn(iframe)
    expect(focusPrompt).not.toHaveBeenCalled()
  })

  it("ignores focus moving to a control that is not an iframe", () => {
    const { button } = mountGrid()
    const focusPrompt = start()
    focusIn(button)
    expect(focusPrompt).not.toHaveBeenCalled()
  })

  it("returns focus again once the click window expires", () => {
    vi.useFakeTimers()
    const { grid, iframe } = mountGrid()
    const focusPrompt = start()
    pointer(grid, "pointerdown")
    vi.advanceTimersByTime(500)
    focusIn(iframe)
    expect(focusPrompt).toHaveBeenCalledTimes(1)
  })

  it("ignores an iframe focus while a fill or send is in progress", () => {
    const { iframe } = mountGrid()
    const focusPrompt = start()
    holdFocusGuard()
    focusIn(iframe)
    expect(focusPrompt).not.toHaveBeenCalled()
    releaseFocusGuard()
    focusIn(iframe)
    expect(focusPrompt).toHaveBeenCalledTimes(1)
  })

  it("drops listeners on cleanup", () => {
    const { grid, iframe } = mountGrid()
    const focusPrompt = vi.fn()
    const removeDocument = vi.spyOn(document, "removeEventListener")
    const removeGrid = vi.spyOn(grid, "removeEventListener")
    const stop = setupFocusGuard(focusPrompt, gridSelector)
    stop()
    focusIn(iframe)
    pointer(grid, "pointerdown")
    focusIn(iframe)
    expect(focusPrompt).not.toHaveBeenCalled()
    expect(removeDocument).toHaveBeenCalledWith("focusin", expect.any(Function))
    expect(removeGrid).toHaveBeenCalledWith("pointerdown", expect.any(Function))
    expect(removeGrid).toHaveBeenCalledWith("pointerup", expect.any(Function))
  })
})

const focusIn = (element: Element): void => {
  element.dispatchEvent(new FocusEvent("focusin", { bubbles: true }))
}

const pointer = (element: Element, type: "pointerdown" | "pointerup"): void => {
  element.dispatchEvent(new Event(type, { bubbles: true }))
}
