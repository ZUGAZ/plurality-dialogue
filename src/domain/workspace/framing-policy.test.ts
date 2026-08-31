import { describe, expect, it } from "@effect/vitest"
import {
  embeddableHosts,
  framingHeaderNames,
  framingResourceTypes,
  framingRuleLifetime,
  hostPermissionPatterns,
} from "./framing-policy"

describe("framing policy", () => {
  it("names exactly the three embeddable hosts", () => {
    expect(embeddableHosts).toEqual([
      "chatgpt.com",
      "claude.ai",
      "gemini.google.com",
    ])
    expect(embeddableHosts).toHaveLength(3)
    expect(embeddableHosts).not.toContain("grok.com")
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
    ])
  })

  it("scopes rules to a workspace tab session", () => {
    expect(framingRuleLifetime).toBe("workspace-tab-session")
  })
})
