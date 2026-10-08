import { Option } from "effect"
import { describe, expect, it } from "@effect/vitest"
import type { SourceUrlPlacement } from "../settings/source-url-placement"
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
        placement: "omit",
      }),
    ).toEqual(Option.some("hello"))
  })

  it("falls through a whitespace selection to the trimmed link", () => {
    expect(
      draftTextFromContextMenu({
        selectionText: " \n\t ",
        linkUrl: " https://example.com/link ",
        pageUrl,
        placement: "omit",
      }),
    ).toEqual(Option.some("https://example.com/link"))
  })

  it("uses the link when there is no selection", () => {
    expect(
      draftTextFromContextMenu({
        selectionText: undefined,
        linkUrl: "https://example.com/link",
        pageUrl,
        placement: "omit",
      }),
    ).toEqual(Option.some("https://example.com/link"))
  })

  it("is none when selection and link are empty", () => {
    expect(
      draftTextFromContextMenu({
        selectionText: "   ",
        linkUrl: " ",
        pageUrl,
        placement: "omit",
      }),
    ).toEqual(Option.none())
  })

  it("does not turn pageUrl into draft text", () => {
    expect(
      draftTextFromContextMenu({
        selectionText: undefined,
        linkUrl: undefined,
        pageUrl,
        placement: "omit",
      }),
    ).toEqual(Option.none())
  })

  it("keeps the base text when placement is omit or pageUrl is blank", () => {
    expect(
      draftTextFromContextMenu({
        selectionText: "hello",
        linkUrl: undefined,
        pageUrl,
        placement: "omit",
      }),
    ).toEqual(Option.some("hello"))
    expect(
      draftTextFromContextMenu({
        selectionText: "hello",
        linkUrl: undefined,
        pageUrl: " \n ",
        placement: "before",
      }),
    ).toEqual(Option.some("hello"))
    expect(
      draftTextFromContextMenu({
        selectionText: "hello",
        linkUrl: undefined,
        pageUrl: undefined,
        placement: "after",
      }),
    ).toEqual(Option.some("hello"))
  })

  it("puts the page url before or after the base text", () => {
    expect(
      draftTextFromContextMenu({
        selectionText: "hello",
        linkUrl: "https://example.com/link",
        pageUrl,
        placement: "before",
      }),
    ).toEqual(Option.some(`Source: ${pageUrl}\n\nhello`))
    expect(
      draftTextFromContextMenu({
        selectionText: "hello",
        linkUrl: "https://example.com/link",
        pageUrl,
        placement: "after",
      }),
    ).toEqual(Option.some(`hello\n\nSource: ${pageUrl}`))
  })

  it("wraps a link-url draft with the page url", () => {
    const linkUrl = "https://example.com/link"
    expect(
      draftTextFromContextMenu({
        selectionText: "   ",
        linkUrl,
        pageUrl,
        placement: "before",
      }),
    ).toEqual(Option.some(`Source: ${pageUrl}\n\n${linkUrl}`))
    expect(
      draftTextFromContextMenu({
        selectionText: undefined,
        linkUrl,
        pageUrl,
        placement: "after",
      }),
    ).toEqual(Option.some(`${linkUrl}\n\nSource: ${pageUrl}`))
  })

  it("does not draft a source line without selection or link", () => {
    const placements: readonly SourceUrlPlacement[] = [
      "omit",
      "before",
      "after",
    ]
    for (const placement of placements) {
      expect(
        draftTextFromContextMenu({
          selectionText: undefined,
          linkUrl: " ",
          pageUrl,
          placement,
        }),
      ).toEqual(Option.none())
    }
  })
})
