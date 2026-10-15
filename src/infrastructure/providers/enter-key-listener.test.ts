// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { afterEach, describe, expect, it } from "@effect/vitest"
import { defaultEnterKeyCustom } from "../../domain/settings/enter-key-custom"
import type { EnterKeyCustom } from "../../domain/settings/enter-key-custom"
import type { EnterKeyPreset } from "../../domain/settings/enter-key-preset"
import { composerSelectors } from "./chatgpt/selectors"
import { installEnterKeyListener } from "./enter-key-listener"

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../test/fixtures/chatgpt/composer-2026-08-31.html",
)

const cleanups: Array<() => void> = []

describe("enter key listener", () => {
  afterEach(() => {
    for (const cleanup of cleanups) {
      cleanup()
    }
    cleanups.length = 0
    document.body.replaceChildren()
  })

  it("leaves default Enter alone", () => {
    const harness = start("default")
    placeCaret(harness.composer, 1)
    let followed = 0
    follow(() => {
      followed += 1
    })
    const event = press(harness.composer, { key: "Enter" })
    const repeated = press(harness.composer, { key: "Enter", repeat: true })
    expect(event.defaultPrevented).toBe(false)
    expect(repeated.defaultPrevented).toBe(false)
    expect(followed).toBe(2)
    expect(harness.clicks()).toBe(0)
    expect(harness.composer.textContent).toBe("ab")
    expect(breakCount(harness.composer)).toBe(0)
  })

  it("inserts a break for swapped Enter and does not send", () => {
    const harness = start("swapped")
    placeCaret(harness.composer, 1)
    const event = press(harness.composer, { key: "Enter" })
    expect(event.defaultPrevented).toBe(true)
    expect(harness.clicks()).toBe(0)
    expect(breakCount(harness.composer)).toBe(1)
  })

  it("sends on swapped Shift+Enter without inserting a break", () => {
    const harness = start("swapped")
    placeCaret(harness.composer, 1)
    const before = harness.composer.innerHTML
    const event = press(harness.composer, { key: "Enter", shiftKey: true })
    expect(event.defaultPrevented).toBe(true)
    expect(harness.clicks()).toBe(1)
    expect(harness.composer.innerHTML).toBe(before)
  })

  it("inserts a break for slack Shift+Enter and sends on Ctrl+Enter", () => {
    const shift = start("slack")
    placeCaret(shift.composer, 1)
    const shiftEvent = press(shift.composer, { key: "Enter", shiftKey: true })
    expect(shiftEvent.defaultPrevented).toBe(true)
    expect(shift.clicks()).toBe(0)
    expect(breakCount(shift.composer)).toBe(1)
    shift.stop()

    const ctrl = start("slack")
    const before = ctrl.composer.innerHTML
    const ctrlEvent = press(ctrl.composer, { key: "Enter", ctrlKey: true })
    expect(ctrlEvent.defaultPrevented).toBe(true)
    expect(ctrl.clicks()).toBe(1)
    expect(ctrl.composer.innerHTML).toBe(before)
  })

  it("passes Alt+Ctrl+Enter through", () => {
    const harness = start("swapped")
    const event = press(harness.composer, {
      key: "Enter",
      altKey: true,
      ctrlKey: true,
    })
    expect(event.defaultPrevented).toBe(false)
    expect(harness.clicks()).toBe(0)
    expect(breakCount(harness.composer)).toBe(0)
  })

  it("swallows a repeated submit and repeats a newline", () => {
    const send = start("swapped")
    press(send.composer, { key: "Enter", shiftKey: true })
    let followed = 0
    follow(() => {
      followed += 1
    })
    const repeated = press(send.composer, {
      key: "Enter",
      shiftKey: true,
      repeat: true,
    })
    expect(repeated.defaultPrevented).toBe(true)
    expect(followed).toBe(0)
    expect(send.clicks()).toBe(1)
    send.stop()

    const newline = start("swapped")
    placeCaret(newline.composer, 1)
    press(newline.composer, { key: "Enter" })
    press(newline.composer, { key: "Enter", repeat: true })
    expect(newline.clicks()).toBe(0)
    expect(breakCount(newline.composer)).toBe(2)
  })

  it("passes mid-IME Enter and Enter after compositionstart", () => {
    const composing = start("swapped")
    const ime = press(composing.composer, { key: "Enter", isComposing: true })
    const legacy = press(composing.composer, { key: "Enter" }, 229)
    expect(ime.defaultPrevented).toBe(false)
    expect(legacy.defaultPrevented).toBe(false)
    expect(composing.clicks()).toBe(0)
    expect(breakCount(composing.composer)).toBe(0)
    composing.stop()

    const session = start("swapped")
    placeCaret(session.composer, 1)
    session.composer.dispatchEvent(
      new Event("compositionstart", { bubbles: true }),
    )
    const during = press(session.composer, { key: "Enter" })
    expect(during.defaultPrevented).toBe(false)
    expect(breakCount(session.composer)).toBe(0)
    session.composer.dispatchEvent(
      new Event("compositionend", { bubbles: true }),
    )
    const after = press(session.composer, { key: "Enter" })
    expect(after.defaultPrevented).toBe(true)
    expect(breakCount(session.composer)).toBe(1)
  })

  it("ignores a non-Enter key and a target outside the composer", () => {
    const harness = start("swapped")
    const other = press(harness.composer, { key: "a" })
    const outside = document.createElement("p")
    document.body.append(outside)
    const missed = press(outside, { key: "Enter" })
    expect(other.defaultPrevented).toBe(false)
    expect(missed.defaultPrevented).toBe(false)
    expect(harness.clicks()).toBe(0)
    expect(harness.composer.textContent).toBe("ab")
  })

  it("ignores the hidden ChatGPT fallback textarea", () => {
    loadFixture()
    const stop = installEnterKeyListener({
      composerSelectors,
      querySend: () => null,
      currentSettings: () => ({
        preset: "swapped",
        custom: defaultEnterKeyCustom,
      }),
      runEffect: (effect) => {
        Effect.runSync(effect)
      },
    })
    cleanups.push(stop)
    const hidden = document.querySelector("textarea.wcDTda_fallbackTextarea")
    expect(hidden).toBeInstanceOf(HTMLTextAreaElement)
    let clicks = 0
    const onClick = (): void => {
      clicks += 1
    }
    document.addEventListener("click", onClick, true)
    cleanups.push(() => {
      document.removeEventListener("click", onClick, true)
    })
    const event =
      hidden === null
        ? press(document.body, { key: "Enter" })
        : press(hidden, { key: "Enter" })
    expect(event.defaultPrevented).toBe(false)
    expect(clicks).toBe(0)
  })

  it("drops the listener on unsubscribe", () => {
    const harness = start("swapped")
    placeCaret(harness.composer, 1)
    harness.stop()
    const event = press(harness.composer, { key: "Enter" })
    expect(event.defaultPrevented).toBe(false)
    expect(harness.clicks()).toBe(0)
    expect(breakCount(harness.composer)).toBe(0)
  })
})

type Harness = {
  readonly composer: HTMLElement
  readonly clicks: () => number
  readonly stop: () => void
}

const start = (
  preset: EnterKeyPreset,
  custom: EnterKeyCustom = defaultEnterKeyCustom,
): Harness => {
  const composer = document.createElement("div")
  composer.contentEditable = "true"
  composer.className = "composer"
  composer.textContent = "ab"
  const send = document.createElement("button")
  send.type = "button"
  let clicks = 0
  send.addEventListener("click", () => {
    clicks += 1
  })
  document.body.append(composer, send)
  const stop = installEnterKeyListener({
    composerSelectors: [".composer"],
    querySend: () => (send.isConnected ? send : null),
    currentSettings: () => ({ preset, custom }),
    runEffect: (effect) => {
      Effect.runSync(effect)
    },
  })
  cleanups.push(stop)
  return { composer, clicks: () => clicks, stop }
}

const follow = (onEvent: () => void): void => {
  const listener = (): void => {
    onEvent()
  }
  document.addEventListener("keydown", listener, true)
  cleanups.push(() => {
    document.removeEventListener("keydown", listener, true)
  })
}

const placeCaret = (element: HTMLElement, offset: number): void => {
  const text = element.firstChild
  if (!(text instanceof Text)) {
    return
  }
  const range = document.createRange()
  range.setStart(text, offset)
  range.collapse(true)
  const selection = document.getSelection()
  if (selection === null) {
    return
  }
  selection.removeAllRanges()
  selection.addRange(range)
}

const press = (
  target: EventTarget,
  init: KeyboardEventInit,
  keyCode?: number,
): KeyboardEvent => {
  const event = new KeyboardEvent("keydown", {
    ...init,
    bubbles: true,
    cancelable: true,
  })
  if (keyCode !== undefined) {
    Object.defineProperty(event, "keyCode", { value: keyCode })
  }
  target.dispatchEvent(event)
  return event
}

const breakCount = (element: HTMLElement): number =>
  element.querySelectorAll("br").length

const loadFixture = (): void => {
  const html = readFileSync(fixturePath, "utf8")
  const parsed = new DOMParser().parseFromString(html, "text/html")
  document.documentElement.innerHTML = parsed.documentElement.innerHTML
}
