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

  it("decodeProviderId rejects unknown, empty, and disabled ids", () => {
    const enabled: readonly ProviderId[] = ["chatgpt", "claude"]
    expect(decodeProviderId("grok", enabled)).toBeNull()
    expect(decodeProviderId("not-a-provider", enabled)).toBeNull()
    expect(decodeProviderId("not-a-provider", ["chatgpt", "claude", "grok"])).toBeNull()
    expect(decodeProviderId("", enabled)).toBeNull()
    expect(decodeProviderId("gemini", enabled)).toBeNull()
    expect(decodeProviderId("chatgpt", enabled)).toBe("chatgpt")
    expect(decodeProviderId("grok", ["chatgpt", "claude", "grok"])).toBe("grok")
  })

  it("labelForProvider and selectOptions follow the enabled set", () => {
    expect(labelForProvider("chatgpt")).toBe("ChatGPT")
    expect(labelForProvider("claude")).toBe("Claude")
    expect(labelForProvider("gemini")).toBe("Gemini")
    expect(labelForProvider("grok")).toBe("Grok")
    expect(
      selectOptions(["chatgpt", "claude", "gemini"]).map((option) => option.id),
    ).toEqual(["chatgpt", "claude", "gemini"])
    expect(
      selectOptions(["chatgpt", "claude", "gemini", "grok"]).map(
        (option) => option.id,
      ),
    ).toEqual(["chatgpt", "claude", "gemini", "grok"])
    expect(
      selectOptions(["chatgpt", "claude", "gemini", "grok"]).map(
        (option) => option.label,
      ),
    ).toEqual(["ChatGPT", "Claude", "Gemini", "Grok"])
    expect(selectOptions(providerIds).map((option) => option.id)).toEqual(
      providerIds,
    )
    expect(
      selectOptions(["gemini", "chatgpt"]).map((option) => option.id),
    ).toEqual(["chatgpt", "gemini"])
  })

  it("panel count limits are 1..4", () => {
    expect(WORKSPACE_MIN_PANEL_COUNT).toBe(1)
    expect(WORKSPACE_MAX_PANEL_COUNT).toBe(4)
  })
})
