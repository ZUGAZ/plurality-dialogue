// @vitest-environment happy-dom
import { describe, expect, it } from "@effect/vitest"
import type { EnterChord } from "./enter-chord"
import {
  imeIdle,
  isMidIme,
  noteCompositionEnd,
  noteCompositionStart,
} from "./ime-session"

describe("ime session", () => {
  it("treats isComposing and keyCode 229 as mid-IME", () => {
    const composing = press({ key: "Enter", isComposing: true })
    const ime = press({ key: "Enter" }, 229)
    const plain = press({ key: "Enter" }, 13)
    expect(isMidIme(imeIdle, composing)).toBe(true)
    expect(isMidIme(imeIdle, ime)).toBe(true)
    expect(plain.isComposing).toBe(false)
    expect(plain.keyCode).toBe(13)
    expect(isMidIme(imeIdle, plain)).toBe(false)
  })

  it("returns to idle after composition end", () => {
    const started = noteCompositionStart()
    expect(started).toEqual({ composing: true })
    expect(isMidIme(started, press({ key: "Enter" }, 13))).toBe(true)
    const ended = noteCompositionEnd()
    expect(ended).toEqual(imeIdle)
    expect(isMidIme(ended, press({ key: "Enter" }, 13))).toBe(false)
  })
})

const press = (init: KeyboardEventInit, keyCode?: number): EnterChord => {
  const event = new KeyboardEvent("keydown", init)
  if (keyCode !== undefined) {
    Object.defineProperty(event, "keyCode", { value: keyCode })
  }
  return {
    key: event.key,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    metaKey: event.metaKey,
    repeat: event.repeat,
    isComposing: event.isComposing,
    keyCode: event.keyCode,
  }
}
