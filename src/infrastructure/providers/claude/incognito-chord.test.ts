// @vitest-environment happy-dom
import { describe, expect, it } from "@effect/vitest"
import {
  claudeIncognitoChordRequest,
  dispatchIncognitoChord,
  installIncognitoChordListener,
  onIncognitoChordMessage,
  requestClaudeIncognitoChord,
} from "./incognito-chord"

describe("claude incognito chord", () => {
  it("uses Ctrl+Shift+I on Windows", () => {
    const chord = pressedChord("Win32")

    expect(chord?.key).toBe("I")
    expect(chord?.code).toBe("KeyI")
    expect(chord?.ctrlKey).toBe(true)
    expect(chord?.metaKey).toBe(false)
    expect(chord?.shiftKey).toBe(true)
  })

  it("uses Cmd+Shift+I on Mac", () => {
    const chord = pressedChord("MacIntel")

    expect(chord?.ctrlKey).toBe(false)
    expect(chord?.metaKey).toBe(true)
    expect(chord?.shiftKey).toBe(true)
  })

  it("dispatches one keydown when this window asks", () => {
    const seen: KeyboardEvent[] = []
    const target = new EventTarget()
    target.addEventListener("keydown", (event) => {
      if (event instanceof KeyboardEvent) {
        seen.push(event)
      }
    })

    onIncognitoChordMessage(message({ source: claudeIncognitoChordRequest }), "Win32", target)
    onIncognitoChordMessage(message({ source: "other" }), "Win32", target)
    onIncognitoChordMessage(
      new MessageEvent("message", { data: { source: claudeIncognitoChordRequest } }),
      "Win32",
      target,
    )

    expect(seen).toHaveLength(1)
    expect(seen[0]?.ctrlKey).toBe(true)
  })

  it("installs a listener that presses the chord for a page request", async () => {
    installIncognitoChordListener()
    const seen: KeyboardEvent[] = []
    document.addEventListener("keydown", (event) => {
      if (event instanceof KeyboardEvent && event.code === "KeyI") {
        seen.push(event)
      }
    })

    requestClaudeIncognitoChord()
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0)
    })

    expect(seen).toHaveLength(1)
    expect(seen[0]?.shiftKey).toBe(true)
  })
})

const pressedChord = (platform: string): KeyboardEvent | undefined => {
  let seen: KeyboardEvent | undefined
  const target = new EventTarget()
  target.addEventListener("keydown", (event) => {
    if (event instanceof KeyboardEvent) {
      seen = event
    }
  })
  dispatchIncognitoChord(target, platform)
  return seen
}

const message = (data: unknown): MessageEvent =>
  new MessageEvent("message", { data, source: window })
