import { describe, expect, it } from "@effect/vitest"
import {
  embeddableHosts,
  hostPermissionPatterns,
} from "@domain/workspace/framing-policy"
import { builtInProviders } from "./built-in-providers"
import { isProviderId, providerIds } from "./provider-id"

describe("built-in providers", () => {
  it("lists the catalog vendors in order", () => {
    expect(builtInProviders.map((provider) => provider.id)).toEqual([
      "chatgpt",
      "claude",
      "gemini",
      "grok",
      "deepseek",
      "kimi",
      "doubao",
      "google",
    ])
    expect(builtInProviders.map((provider) => provider.id)).toEqual(providerIds)
    expect(isProviderId("google")).toBe(true)
    expect(isProviderId("grok")).toBe(true)
    expect(isProviderId("not-a-provider")).toBe(false)
  })

  it("hosts match embeddableHosts and host permission patterns", () => {
    expect(builtInProviders.map((provider) => provider.host)).toEqual([
      ...embeddableHosts,
    ])
    expect(hostPermissionPatterns).toEqual([
      "https://chatgpt.com/*",
      "https://claude.ai/*",
      "https://gemini.google.com/*",
      "https://grok.com/*",
      "https://chat.deepseek.com/*",
      "https://www.kimi.com/*",
      "https://www.doubao.com/*",
      "https://www.google.com/*",
    ])
    const patterns: readonly string[] = hostPermissionPatterns
    expect(patterns.includes("https://google.com/*")).toBe(false)
  })

  it("uses https urls whose hostname equals host", () => {
    for (const provider of builtInProviders) {
      const parsed = new URL(provider.url)
      expect(parsed.protocol).toBe("https:")
      expect(parsed.hostname).toBe(provider.host)
    }
  })

  it("stores the catalog iframe urls", () => {
    expect(builtInProviders.map((provider) => provider.url)).toEqual([
      "https://chatgpt.com/",
      "https://claude.ai/new",
      "https://gemini.google.com/app",
      "https://grok.com/",
      "https://chat.deepseek.com/",
      "https://www.kimi.com/",
      "https://www.doubao.com/chat/",
      "https://www.google.com/search?udm=50",
    ])
    const google = builtInProviders.find((provider) => provider.id === "google")
    expect(google).toBeDefined()
    if (google !== undefined) {
      const parsed = new URL(google.url)
      expect(parsed.protocol).toBe("https:")
      expect(parsed.hostname).toBe("www.google.com")
      expect(parsed.pathname).toBe("/search")
      expect(parsed.searchParams.get("udm")).toBe("50")
      expect(parsed.searchParams.has("q")).toBe(false)
      expect(parsed.searchParams.has("hl")).toBe(false)
      expect(parsed.searchParams.has("gl")).toBe(false)
      expect(parsed.searchParams.has("aep")).toBe(false)
    }
  })

  it("sets iconId to id and English display names", () => {
    for (const provider of builtInProviders) {
      expect(provider.iconId).toBe(provider.id)
    }
    expect(builtInProviders.map((provider) => provider.displayName)).toEqual([
      "ChatGPT",
      "Claude",
      "Gemini",
      "Grok",
      "DeepSeek",
      "Kimi",
      "Doubao",
      "Google AI Mode",
    ])
  })
})
