import { describe, expect, it } from "@effect/vitest"
import {
  maxImageBytes,
  maxPendingImages,
  type ImageRejection,
} from "@domain/broadcast/pending-image"
import { PanelFailed } from "@domain/broadcast/panel-failed"
import { PanelSucceeded } from "@domain/broadcast/panel-succeeded"
import {
  canClearBar,
  draftAfterFillOrSend,
  failedPanelsFromResults,
  failureLine,
  imageDisplayName,
  imageRejectionText,
  isDraftEmpty,
  isImageNotice,
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

describe("canClearBar", () => {
  it("is true for text or at least one image", () => {
    expect(canClearBar("", 0)).toBe(false)
    expect(canClearBar("  \n", 0)).toBe(false)
    expect(canClearBar("", 1)).toBe(true)
    expect(canClearBar("hi", 0)).toBe(true)
  })
})

describe("imageDisplayName", () => {
  it("trims and replaces a blank name", () => {
    expect(imageDisplayName("  ")).toBe("image")
    expect(imageDisplayName("a.png")).toBe("a.png")
  })
})

describe("imageRejectionText", () => {
  const sentences: ReadonlyArray<{
    readonly rejection: ImageRejection
    readonly text: string
  }> = [
    {
      rejection: { _tag: "UnsupportedImageType" },
      text: "Only PNG, JPEG, WebP, and GIF images can be attached.",
    },
    {
      rejection: { _tag: "ImageEmpty" },
      text: "That image is empty.",
    },
    {
      rejection: { _tag: "ImageTooLarge" },
      text: `Each image must be ${maxImageBytes / (1024 * 1024)} MB or smaller.`,
    },
    {
      rejection: { _tag: "TooManyImages" },
      text: `Only ${maxPendingImages} images can be attached.`,
    },
    {
      rejection: { _tag: "ImageUnreadable" },
      text: "That image could not be read.",
    },
  ]

  it("uses the cap constants in each sentence", () => {
    for (const sentence of sentences) {
      expect(imageRejectionText(sentence.rejection)).toBe(sentence.text)
    }
  })

  it("treats those sentences as image notices", () => {
    for (const sentence of sentences) {
      expect(isImageNotice({ kind: "notice", text: sentence.text })).toBe(true)
    }
    expect(
      isImageNotice({
        kind: "notice",
        text: "Failed: panel-1 (ChatGPT)",
      }),
    ).toBe(false)
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
