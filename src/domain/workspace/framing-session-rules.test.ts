import { Either } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  dnrUrlFilters,
  framingHeaderNames,
  framingResourceTypes,
} from "./framing-policy"
import {
  collectWorkspaceTabIds,
  framingRuleIdsForTab,
  framingSessionRulesForTab,
  nonEmptyDocumentUrls,
  parseWorkspaceTabId,
  resolveFramingTabId,
} from "./framing-session-rules"

describe("framing session rules", () => {
  it("maps three host specs for a tab without Grok", () => {
    const specs = framingSessionRulesForTab(1)
    expect(specs).toHaveLength(3)
    expect(specs.map((spec) => spec.condition.urlFilter)).toEqual(
      dnrUrlFilters,
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

  it("keeps rule ids inside signed 32-bit for a large tab id", () => {
    const ids = framingRuleIdsForTab(1_173_892_741)
    expect(new Set(ids).size).toBe(3)
    for (const id of ids) {
      expect(Number.isInteger(id)).toBe(true)
      expect(id).toBeGreaterThanOrEqual(1)
      expect(id).toBeLessThanOrEqual(2_147_483_647)
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

  it("prefers sender tab id and falls back to the requested id", () => {
    const fromSender = resolveFramingTabId(9, 4)
    expect(Either.isRight(fromSender)).toBe(true)
    if (Either.isRight(fromSender)) {
      expect(fromSender.right).toBe(9)
    }
    const fromRequest = resolveFramingTabId(undefined, 4)
    expect(Either.isRight(fromRequest)).toBe(true)
    if (Either.isRight(fromRequest)) {
      expect(fromRequest.right).toBe(4)
    }
    expect(Either.isLeft(resolveFramingTabId(undefined, 0))).toBe(true)
    expect(Either.isLeft(resolveFramingTabId(undefined, undefined))).toBe(true)
  })

  it("collects unique valid tab ids in first-seen order", () => {
    expect(collectWorkspaceTabIds([undefined, 0, 4, 4, 9])).toEqual([4, 9])
  })

  it("keeps unique non-empty document urls", () => {
    expect(
      nonEmptyDocumentUrls([
        undefined,
        "",
        "chrome-extension://id/workspace.html",
        "chrome-extension://id/workspace.html",
        "chrome-extension://id/options.html",
      ]),
    ).toEqual([
      "chrome-extension://id/workspace.html",
      "chrome-extension://id/options.html",
    ])
  })
})
