import { describe, expect, it } from "@effect/vitest"
import { providerIds, type ProviderId } from "@domain/provider/provider-id"
import {
  WORKSPACE_MAX_PANEL_COUNT,
  WORKSPACE_MIN_PANEL_COUNT,
  decodeProviderId,
  handshakeErrorText,
  iframeSrc,
  labelForProvider,
  selectOptions,
} from "./model"

describe("panel grid model", () => {
  it("withholds iframe src until framing is ready", () => {
    const url = "https://example.com/chat"
    expect(iframeSrc(false, url)).toBeUndefined()
    expect(iframeSrc(true, url)).toBe(url)
  })

  it("prefers handshake reason text over the error tag", () => {
    expect(
      handshakeErrorText({
        _tag: "FramingHandshakeFailed",
        reason: "Could not apply framing rules",
      }),
    ).toBe("Could not apply framing rules")
    expect(handshakeErrorText({ _tag: "MessagingSendFailed" })).toBe(
      "MessagingSendFailed",
    )
  })

  it("decodeProviderId rejects grok, empty, and disabled ids", () => {
    const enabled: readonly ProviderId[] = ["chatgpt", "claude"]
    expect(decodeProviderId("grok", enabled)).toBeNull()
    expect(decodeProviderId("", enabled)).toBeNull()
    expect(decodeProviderId("gemini", enabled)).toBeNull()
    expect(decodeProviderId("chatgpt", enabled)).toBe("chatgpt")
  })

  it("labelForProvider and selectOptions use English labels without grok", () => {
    expect(labelForProvider("chatgpt")).toBe("ChatGPT")
    expect(labelForProvider("claude")).toBe("Claude")
    expect(labelForProvider("gemini")).toBe("Gemini")
    const options = selectOptions(providerIds)
    expect(options.map((option) => option.label)).toEqual([
      "ChatGPT",
      "Claude",
      "Gemini",
    ])
    expect(options.map((option) => option.id)).toEqual(providerIds)
    expect(
      selectOptions(["gemini", "chatgpt"]).map((option) => option.id),
    ).toEqual(["chatgpt", "gemini"])
  })

  it("panel count limits are 1..4", () => {
    expect(WORKSPACE_MIN_PANEL_COUNT).toBe(1)
    expect(WORKSPACE_MAX_PANEL_COUNT).toBe(4)
  })
})
