import { Either } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  framingHeaderNames,
  framingResourceTypes,
  hostPermissionPatterns,
} from "./framing-policy"
import {
  framingRuleIdsForTab,
  framingSessionRulesForTab,
  parseWorkspaceTabId,
} from "./framing-session-rules"

describe("framing session rules", () => {
  it("maps three host specs for a tab without Grok", () => {
    const specs = framingSessionRulesForTab(1)
    expect(specs).toHaveLength(3)
    expect(specs.map((spec) => spec.condition.urlFilter)).toEqual(
      hostPermissionPatterns,
    )
    for (const spec of specs) {
      expect(spec.condition.urlFilter.includes("grok.com")).toBe(false)
      expect(spec.condition.tabIds).toEqual([1])
      expect(spec.condition.resourceTypes).toEqual(framingResourceTypes)
      expect(spec.condition.resourceTypes).toEqual(["sub_frame"])
      expect(spec.action.responseHeaders.map((header) => header.header)).toEqual(
        [...framingHeaderNames],
      )
      expect(
        spec.action.responseHeaders.every(
          (header) => header.operation === "remove",
        ),
      ).toBe(true)
    }
  })

  it("assigns disjoint rule ids for different tabs", () => {
    const first = framingRuleIdsForTab(1)
    const second = framingRuleIdsForTab(2)
    expect(first).toHaveLength(3)
    expect(second).toHaveLength(3)
    expect(new Set([...first, ...second]).size).toBe(6)
  })

  it("parses only integer tab ids of 1 or more", () => {
    expect(Either.isLeft(parseWorkspaceTabId(undefined))).toBe(true)
    expect(Either.isLeft(parseWorkspaceTabId(0))).toBe(true)
    expect(Either.isLeft(parseWorkspaceTabId(-1))).toBe(true)
    expect(Either.isRight(parseWorkspaceTabId(1))).toBe(true)
  })
})
