// @vitest-environment happy-dom
import { describe, expect, it } from "@effect/vitest"
import { isThisWindow } from "./page-file-assign"

describe("isThisWindow", () => {
  it("accepts this window and ignores a frame that throws", () => {
    expect(isThisWindow(window)).toBe(true)
    expect(isThisWindow(null)).toBe(false)
    const frame = new Proxy(window, {
      has() {
        throw new DOMException(
          "Blocked a frame with origin from accessing a cross-origin frame.",
          "SecurityError",
        )
      },
      get() {
        throw new DOMException(
          "Blocked a frame with origin from accessing a cross-origin frame.",
          "SecurityError",
        )
      },
    })
    expect(isThisWindow(frame)).toBe(false)
  })
})
