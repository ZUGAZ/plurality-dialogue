import { Either } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  dnrUrlFilters,
  embeddableHosts,
  framingHeaderNames,
  framingResourceTypes,
  optionalHosts,
} from "./framing-policy"
import {
  collectWorkspaceTabIds,
  enabledOptionalHosts,
  framingRuleId,
  framingRuleIdsForTab,
  framingSessionRulesForTab,
  nonEmptyDocumentUrls,
  parseWorkspaceTabId,
  resolveFramingTabId,
  ruleIdStride,
} from "./framing-session-rules"

describe("framing session rules", () => {
  it("maps one sub_frame spec per embeddable host", () => {
    const specs = framingSessionRulesForTab(1)
    expect(specs).toHaveLength(8)
    expect(specs.map((spec) => spec.condition.urlFilter)).toEqual(
      dnrUrlFilters,
    )
    expect(specs.map((spec) => spec.id)).toEqual([
      10, 11, 12, 13, 14, 15, 16, 17,
    ])
    expect(
      specs.some((spec) => spec.condition.urlFilter === "||grok.com/"),
    ).toBe(true)
    expect(specs.map((spec) => spec.condition.urlFilter).at(-1)).toBe(
      "||www.google.com/",
    )
    expect(framingRuleId(1, 0)).toBe(10)
    expect(framingRuleId(1, 7)).toBe(17)
    expect(framingRuleId(2, 0)).toBe(19)
    for (const spec of specs) {
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
    expect(ids).toHaveLength(12)
    expect(new Set(ids).size).toBe(12)
    for (const id of ids) {
      expect(Number.isInteger(id)).toBe(true)
      expect(id).toBeGreaterThanOrEqual(1)
      expect(id).toBeLessThanOrEqual(2_147_483_647)
    }
  })

  it("assigns disjoint static and optional rule ids", () => {
    expect(ruleIdStride).toBe(embeddableHosts.length + 1)
    expect(ruleIdStride).toBe(9)
    const first = framingRuleIdsForTab(1)
    const second = framingRuleIdsForTab(2)
    expect(first).toHaveLength(12)
    expect(second).toHaveLength(12)
    const ids = [...first, ...second]
    expect(new Set(ids).size).toBe(24)
    const staticIds = first.slice(0, embeddableHosts.length)
    const optionalIds = first.slice(embeddableHosts.length)
    expect(optionalIds).toEqual([45, 54, 63, 72])
    expect(framingRuleIdsForTab(2).slice(embeddableHosts.length)).toEqual([
      81, 90, 99, 108,
    ])
    for (const id of staticIds) {
      expect(id % ruleIdStride).not.toBe(0)
    }
    for (const id of optionalIds) {
      expect(id % ruleIdStride).toBe(0)
    }
    expect(staticIds.some((id) => optionalIds.includes(id))).toBe(false)
  })

  it("adds a rule only for enabled optional hosts", () => {
    expect(framingSessionRulesForTab(1)).toHaveLength(8)
    const all = framingSessionRulesForTab(1, [...optionalHosts])
    expect(all).toHaveLength(12)
    expect(all.slice(8).map((spec) => spec.id)).toEqual([45, 54, 63, 72])
    const withoutZai = optionalHosts.filter((host) => host !== "chat.z.ai")
    const specs = framingSessionRulesForTab(1, withoutZai)
    expect(specs).toHaveLength(11)
    expect(
      specs.some((spec) => spec.condition.urlFilter === "||chat.z.ai/"),
    ).toBe(false)
    expect(framingRuleIdsForTab(1)).toContain(72)
    expect(enabledOptionalHosts(["zai", "qwen-china"])).toEqual([
      "www.qianwen.com",
      "chat.z.ai",
    ])
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
