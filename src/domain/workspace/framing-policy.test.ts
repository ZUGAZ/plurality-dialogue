import { describe, expect, it } from "@effect/vitest"
import {
  dnrUrlFilters,
  embeddableHosts,
  framingHeaderNames,
  framingResourceTypes,
  framingRuleLifetime,
  hostPermissionPatterns,
} from "./framing-policy"

describe("framing policy", () => {
  it("names the embeddable hosts in catalog order", () => {
    expect(embeddableHosts).toEqual([
      "chatgpt.com",
      "claude.ai",
      "gemini.google.com",
      "grok.com",
      "chat.deepseek.com",
      "www.kimi.com",
      "www.doubao.com",
      "www.google.com",
    ])
    const hosts: readonly string[] = embeddableHosts
    expect(hosts.includes("grok.com")).toBe(true)
    expect(hosts.includes("google.com")).toBe(false)
  })

  it("lists both framing headers", () => {
    expect(framingHeaderNames).toEqual([
      "X-Frame-Options",
      "Content-Security-Policy",
    ])
  })

  it("applies only to sub_frame requests", () => {
    expect(framingResourceTypes).toEqual(["sub_frame"])
  })

  it("exposes host permission patterns for those hosts", () => {
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
  })

  it("exposes DNR domain-anchor filters, not match patterns", () => {
    expect(dnrUrlFilters).toEqual([
      "||chatgpt.com/",
      "||claude.ai/",
      "||gemini.google.com/",
      "||grok.com/",
      "||chat.deepseek.com/",
      "||www.kimi.com/",
      "||www.doubao.com/",
      "||www.google.com/",
    ])
  })

  it("scopes rules to a workspace tab session", () => {
    expect(framingRuleLifetime).toBe("workspace-tab-session")
  })
})
