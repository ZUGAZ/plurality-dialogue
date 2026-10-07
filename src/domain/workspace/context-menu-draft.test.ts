import { Option } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  contextMenuContexts,
  contextMenuDocumentUrlPatterns,
  draftTextFromContextMenu,
  sendToPluralityDialogueMenuId,
  sendToPluralityDialogueMenuTitle,
} from "./context-menu-draft"

const pageUrl = "https://example.com/article"

describe("draftTextFromContextMenu", () => {
  it("names one http(s) menu item", () => {
    expect(sendToPluralityDialogueMenuId).toBe("send-to-plurality-dialogue")
    expect(sendToPluralityDialogueMenuTitle).toBe("Send to Plurality Dialogue")
    expect(contextMenuContexts).toEqual(["page", "selection", "link"])
    expect(contextMenuDocumentUrlPatterns).toEqual([
      "http://*/*",
      "https://*/*",
    ])
  })

  it("prefers a trimmed selection over the link and the page url", () => {
    expect(
      draftTextFromContextMenu({
        selectionText: "  hello  ",
        linkUrl: "https://example.com/link",
        pageUrl,
      }),
    ).toEqual(Option.some("hello"))
  })

  it("falls through a whitespace selection to the trimmed link", () => {
    expect(
      draftTextFromContextMenu({
        selectionText: " \n\t ",
        linkUrl: " https://example.com/link ",
        pageUrl,
      }),
    ).toEqual(Option.some("https://example.com/link"))
  })

  it("uses the link when there is no selection", () => {
    expect(
      draftTextFromContextMenu({
        selectionText: undefined,
        linkUrl: "https://example.com/link",
        pageUrl,
      }),
    ).toEqual(Option.some("https://example.com/link"))
  })

  it("is none when selection and link are empty", () => {
    expect(
      draftTextFromContextMenu({
        selectionText: "   ",
        linkUrl: " ",
        pageUrl,
      }),
    ).toEqual(Option.none())
  })

  it("does not turn pageUrl into draft text", () => {
    expect(
      draftTextFromContextMenu({
        selectionText: undefined,
        linkUrl: undefined,
        pageUrl,
      }),
    ).toEqual(Option.none())
  })
})
