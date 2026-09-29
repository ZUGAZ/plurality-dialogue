import { describe, expect, it } from "@effect/vitest"
import { chromeErrorMessage } from "./chrome-error-message"

describe("chromeErrorMessage", () => {
  it("reads strings, Error, and message objects", () => {
    expect(chromeErrorMessage("no host access", "fallback")).toBe(
      "no host access",
    )
    expect(chromeErrorMessage(new Error("Invalid tab id"), "fallback")).toBe(
      "Invalid tab id",
    )
    expect(chromeErrorMessage({ message: "Invalid url filter" }, "fallback")).toBe(
      "Invalid url filter",
    )
    expect(chromeErrorMessage(undefined, "fallback")).toBe("fallback")
  })
})
