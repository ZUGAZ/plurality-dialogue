import { describe, expect, it } from "@effect/vitest"
import {
  draftAfterFillOrSend,
  isDraftEmpty,
  statusText,
} from "./model"

describe("isDraftEmpty", () => {
  it("treats empty and whitespace as empty", () => {
    expect(isDraftEmpty("")).toBe(true)
    expect(isDraftEmpty("  \n")).toBe(true)
    expect(isDraftEmpty("hi")).toBe(false)
  })
})

describe("statusText", () => {
  it("maps each bar status to copy", () => {
    expect(statusText({ kind: "idle" })).toBe("")
    expect(statusText({ kind: "fill-not-wired" })).toBe(
      "Fill isn't connected yet.",
    )
    expect(statusText({ kind: "send-not-wired" })).toBe(
      "Send All isn't connected yet.",
    )
  })
})

describe("draftAfterFillOrSend", () => {
  it("keeps fill success, clears send success, and keeps failures", () => {
    expect(draftAfterFillOrSend("fill", "hi", "succeeded")).toBe("hi")
    expect(draftAfterFillOrSend("send", "hi", "succeeded")).toBe("")
    expect(draftAfterFillOrSend("fill", "hi", "failed")).toBe("hi")
    expect(draftAfterFillOrSend("send", "hi", "failed")).toBe("hi")
  })
})
