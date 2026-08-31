import { describe, expect, it } from "@effect/vitest"
import {
  embeddableHosts,
  hostPermissionPatterns,
} from "@domain/workspace/framing-policy"
import { builtInProviders } from "./built-in-providers"
import { isProviderId, providerIds } from "./provider-id"

describe("built-in providers", () => {
  it("lists exactly three vendors in catalog order", () => {
    expect(builtInProviders).toHaveLength(3)
    expect(builtInProviders.map((provider) => provider.id)).toEqual(providerIds)
  })

  it("does not include grok", () => {
    expect(isProviderId("grok")).toBe(false)
    expect(JSON.stringify(builtInProviders)).not.toContain("grok")
  })

  it("hosts match embeddableHosts and host permission patterns", () => {
    expect(builtInProviders.map((provider) => provider.host)).toEqual([
      ...embeddableHosts,
    ])
    expect(hostPermissionPatterns).toEqual([
      "https://chatgpt.com/*",
      "https://claude.ai/*",
      "https://gemini.google.com/*",
    ])
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
    ])
  })

  it("sets iconId to id and English display names", () => {
    for (const provider of builtInProviders) {
      expect(provider.iconId).toBe(provider.id)
    }
    expect(builtInProviders.map((provider) => provider.displayName)).toEqual([
      "ChatGPT",
      "Claude",
      "Gemini",
    ])
  })
})
