import { describe, expect, it } from "@effect/vitest"
import { providerIds } from "@domain/provider/provider-id"
import { WORKSPACE_DEFAULT_SLOT_COUNT } from "./model"
import {
  appendPanelSlot,
  bumpPanelGeneration,
  canAddPanel,
  canRemovePanel,
  createDefaultSlots,
  initialPanelGrid,
  panelProvidersFromSlots,
  reconcileSlotsWithEnabled,
  removePanelSlot,
  replacePanelProvider,
  resizeSlots,
  slotsFromPanelProviders,
  staleLoadedPanelIds,
} from "./slots"

describe("panel grid slots", () => {
  it("cycles three enabled ids into default slots", () => {
    const slots = createDefaultSlots(providerIds, WORKSPACE_DEFAULT_SLOT_COUNT)
    expect(slots.map((slot) => slot.providerId)).toEqual([
      "chatgpt",
      "claude",
      "gemini",
    ])
    expect(slots.map((slot) => slot.id)).toEqual([
      "panel-1",
      "panel-2",
      "panel-3",
    ])
    expect(slots.every((slot) => slot.reloadGeneration === 0)).toBe(true)
  })

  it("cycles two enabled ids across three slots", () => {
    const slots = createDefaultSlots(
      ["chatgpt", "claude"],
      WORKSPACE_DEFAULT_SLOT_COUNT,
    )
    expect(slots.map((slot) => slot.providerId)).toEqual([
      "chatgpt",
      "claude",
      "chatgpt",
    ])
  })

  it("copies one enabled id into three slots", () => {
    const slots = createDefaultSlots(["gemini"], WORKSPACE_DEFAULT_SLOT_COUNT)
    expect(slots.map((slot) => slot.providerId)).toEqual([
      "gemini",
      "gemini",
      "gemini",
    ])
  })

  it("fills three null slots when none are enabled", () => {
    const slots = createDefaultSlots([], WORKSPACE_DEFAULT_SLOT_COUNT)
    expect(slots.map((slot) => slot.providerId)).toEqual([null, null, null])
  })

  it("replacePanelProvider changes only the named slot", () => {
    const slots = createDefaultSlots(providerIds, WORKSPACE_DEFAULT_SLOT_COUNT)
    const next = replacePanelProvider(slots, "panel-2", "chatgpt")
    expect(next.map((slot) => slot.providerId)).toEqual([
      "chatgpt",
      "chatgpt",
      "gemini",
    ])
    expect(next[0]?.reloadGeneration).toBe(0)
    expect(next[1]?.reloadGeneration).toBe(1)
    expect(next[2]?.reloadGeneration).toBe(0)
    expect(next[0]).toBe(slots[0])
    expect(next[2]).toBe(slots[2])
  })

  it("replacePanelProvider is a no-op for the same id", () => {
    const slots = createDefaultSlots(providerIds, WORKSPACE_DEFAULT_SLOT_COUNT)
    expect(replacePanelProvider(slots, "panel-1", "chatgpt")).toBe(slots)
  })

  it("replacePanelProvider is a no-op for an unknown panel", () => {
    const slots = createDefaultSlots(providerIds, WORKSPACE_DEFAULT_SLOT_COUNT)
    expect(replacePanelProvider(slots, "panel-9", "chatgpt")).toBe(slots)
  })

  it("bumpPanelGeneration bumps only that slot", () => {
    const slots = createDefaultSlots(providerIds, WORKSPACE_DEFAULT_SLOT_COUNT)
    const next = bumpPanelGeneration(slots, "panel-3")
    expect(next[0]?.reloadGeneration).toBe(0)
    expect(next[1]?.reloadGeneration).toBe(0)
    expect(next[2]?.reloadGeneration).toBe(1)
    expect(next[2]?.providerId).toBe("gemini")
    expect(bumpPanelGeneration(slots, "panel-9")).toBe(slots)
  })

  it("reconcileSlotsWithEnabled drops a disabled id and does not invent grok", () => {
    const slots = createDefaultSlots(providerIds, WORKSPACE_DEFAULT_SLOT_COUNT)
    const next = reconcileSlotsWithEnabled(slots, ["chatgpt", "claude"])
    expect(next.map((slot) => slot.providerId)).toEqual([
      "chatgpt",
      "claude",
      "chatgpt",
    ])
    expect(next[0]?.reloadGeneration).toBe(0)
    expect(next[1]?.reloadGeneration).toBe(0)
    expect(next[2]?.reloadGeneration).toBe(1)
    expect(next.some((slot) => slot.providerId === "gemini")).toBe(false)
  })

  it("resizeSlots grows 1x3 to 2x2 keeping a customized prefix", () => {
    const slots = replacePanelProvider(
      createDefaultSlots(providerIds, WORKSPACE_DEFAULT_SLOT_COUNT),
      "panel-2",
      "chatgpt",
    )
    const next = resizeSlots(slots, providerIds, 4)
    expect(next.map((slot) => slot.id)).toEqual([
      "panel-1",
      "panel-2",
      "panel-3",
      "panel-4",
    ])
    expect(next.map((slot) => slot.providerId)).toEqual([
      "chatgpt",
      "chatgpt",
      "gemini",
      "chatgpt",
    ])
    expect(next[0]).toBe(slots[0])
    expect(next[1]).toBe(slots[1])
    expect(next[2]).toBe(slots[2])
    expect(next[3]?.reloadGeneration).toBe(0)
  })

  it("resizeSlots shrinks 2x2 to 1x2 by unmounting the suffix", () => {
    const slots = createDefaultSlots(providerIds, 4)
    const next = resizeSlots(slots, providerIds, 2)
    expect(next.map((slot) => slot.id)).toEqual(["panel-1", "panel-2"])
    expect(next).toHaveLength(2)
    expect(next.some((slot) => slot.id === "panel-3")).toBe(false)
    expect(next.some((slot) => slot.id === "panel-4")).toBe(false)
    expect(next[0]).toBe(slots[0])
    expect(next[1]).toBe(slots[1])
  })

  it("resizeSlots is a no-op when the count already matches", () => {
    const slots = createDefaultSlots(providerIds, WORKSPACE_DEFAULT_SLOT_COUNT)
    expect(resizeSlots(slots, providerIds, 3)).toBe(slots)
  })

  it("slotsFromPanelProviders and panelProvidersFromSlots round-trip", () => {
    const providers = ["claude", "claude", null, "gemini"] as const
    const slots = slotsFromPanelProviders(providers)
    expect(slots.map((slot) => slot.id)).toEqual([
      "panel-1",
      "panel-2",
      "panel-3",
      "panel-4",
    ])
    expect(slots.every((slot) => slot.reloadGeneration === 0)).toBe(true)
    expect(panelProvidersFromSlots(slots)).toEqual(providers)
  })

  it("appendPanelSlot adds a cycled fourth panel keeping the prefix", () => {
    const slots = replacePanelProvider(
      createDefaultSlots(providerIds, WORKSPACE_DEFAULT_SLOT_COUNT),
      "panel-2",
      "chatgpt",
    )
    const next = appendPanelSlot(slots, providerIds)
    expect(next.map((slot) => slot.id)).toEqual([
      "panel-1",
      "panel-2",
      "panel-3",
      "panel-4",
    ])
    expect(next.map((slot) => slot.providerId)).toEqual([
      "chatgpt",
      "chatgpt",
      "gemini",
      "chatgpt",
    ])
    expect(next[0]).toBe(slots[0])
    expect(next[1]).toBe(slots[1])
    expect(next[2]).toBe(slots[2])
  })

  it("appendPanelSlot is a no-op at four panels", () => {
    const slots = createDefaultSlots(providerIds, 4)
    expect(appendPanelSlot(slots, providerIds)).toBe(slots)
    expect(canAddPanel(slots)).toBe(false)
  })

  it("appendPanelSlot leaves a null provider when none are enabled", () => {
    const slots = createDefaultSlots([], 1)
    expect(appendPanelSlot(slots, []).map((slot) => slot.providerId)).toEqual([
      null,
      null,
    ])
  })

  it("removePanelSlot drops only the named panel and keeps neighbour ids", () => {
    const slots = createDefaultSlots(providerIds, 4)
    const next = removePanelSlot(slots, "panel-2")
    expect(next.map((slot) => slot.id)).toEqual([
      "panel-1",
      "panel-3",
      "panel-4",
    ])
    expect(next[0]).toBe(slots[0])
    expect(next[1]).toBe(slots[2])
    expect(next[2]).toBe(slots[3])
  })

  it("removePanelSlot is a no-op for the last panel and unknown ids", () => {
    const single = createDefaultSlots(providerIds, 1)
    expect(removePanelSlot(single, "panel-1")).toBe(single)
    expect(canRemovePanel(single)).toBe(false)
    const three = createDefaultSlots(providerIds, 3)
    expect(removePanelSlot(three, "panel-9")).toBe(three)
    expect(canRemovePanel(three)).toBe(true)
  })

  it("appendPanelSlot after a mid-list remove never reuses a live id", () => {
    const slots = removePanelSlot(createDefaultSlots(providerIds, 3), "panel-2")
    const next = appendPanelSlot(slots, providerIds)
    expect(next.map((slot) => slot.id)).toEqual([
      "panel-1",
      "panel-3",
      "panel-4",
    ])
    expect(next[2]?.providerId).toBe("gemini")
  })

  it("resizeSlots grows past a gap without duplicating ids", () => {
    const slots = removePanelSlot(createDefaultSlots(providerIds, 3), "panel-2")
    const next = resizeSlots(slots, providerIds, 4)
    expect(next.map((slot) => slot.id)).toEqual([
      "panel-1",
      "panel-3",
      "panel-4",
      "panel-5",
    ])
  })

  it("staleLoadedPanelIds lists removed and regenerated panels only", () => {
    const slots = createDefaultSlots(providerIds, 3)
    const removed = removePanelSlot(slots, "panel-2")
    expect(staleLoadedPanelIds(slots, removed)).toEqual(["panel-2"])
    const bumped = bumpPanelGeneration(removed, "panel-3")
    expect(staleLoadedPanelIds(removed, bumped)).toEqual(["panel-3"])
    expect(staleLoadedPanelIds(slots, slots)).toEqual([])
  })

  it("initialPanelGrid keeps layout-driven defaults without stored providers", () => {
    const grid = initialPanelGrid("1x2", undefined)
    expect(grid.layoutId).toBe("1x2")
    expect(panelProvidersFromSlots(grid.slots)).toEqual(["chatgpt", "claude"])
  })

  it("initialPanelGrid restores providers and fixes a mismatched layout", () => {
    const matching = initialPanelGrid("1x3", ["claude", "claude", "gemini"])
    expect(matching.layoutId).toBe("1x3")
    expect(panelProvidersFromSlots(matching.slots)).toEqual([
      "claude",
      "claude",
      "gemini",
    ])
    const mismatched = initialPanelGrid("1x3", ["gemini", "claude"])
    expect(mismatched.layoutId).toBe("1x2")
    expect(mismatched.slots).toHaveLength(2)
  })
})
