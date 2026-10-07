import { describe, expect, it } from "@effect/vitest"
import { PanelFailed } from "@domain/broadcast/panel-failed"
import { PanelSucceeded } from "@domain/broadcast/panel-succeeded"
import {
  draftAfterFillOrSend,
  failedPanelsFromResults,
  failureLine,
  isDraftEmpty,
  retryLabel,
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
  it("maps idle and notice", () => {
    expect(statusText({ kind: "idle" })).toBe("")
    expect(statusText({ kind: "notice", text: "Failed: panel-1 (ChatGPT)" })).toBe(
      "Failed: panel-1 (ChatGPT)",
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

describe("retryLabel", () => {
  it("is non-empty", () => {
    expect(retryLabel).toBe("Retry Failed")
    expect(retryLabel.length).toBeGreaterThan(0)
  })
})

describe("failedPanelsFromResults", () => {
  it("extracts failures and is empty when every panel succeeds", () => {
    expect(
      failedPanelsFromResults([
        PanelSucceeded.make({
          panelId: "panel-1",
          providerId: "chatgpt",
          verb: "filled",
        }),
        PanelFailed.make({
          panelId: "panel-2",
          providerId: "claude",
          reason: "composer-not-found",
        }),
      ]),
    ).toEqual([{ panelId: "panel-2", providerId: "claude" }])
    expect(
      failedPanelsFromResults([
        PanelSucceeded.make({
          panelId: "panel-1",
          providerId: "chatgpt",
          verb: "submitted",
        }),
      ]),
    ).toEqual([])
  })
})

describe("failureLine", () => {
  it("lists failed panel ids and labels", () => {
    expect(failureLine([])).toBe("")
    expect(
      failureLine([
        { panelId: "panel-1", label: "ChatGPT" },
        { panelId: "panel-3", label: "Gemini" },
      ]),
    ).toBe("Failed: panel-1 (ChatGPT), panel-3 (Gemini)")
  })
})
