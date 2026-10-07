import { describe, expect, it } from "@effect/vitest"
import { providerIds } from "@domain/provider/provider-id"
import { WORKSPACE_DEFAULT_SLOT_COUNT } from "./model"
import {
  bumpAllLoadedPanels,
  bumpPanelGeneration,
  createDefaultSlots,
  slotsFromPanelProviders,
} from "./slots"

const loaded = (ids: readonly string[]): ReadonlySet<string> => new Set(ids)

describe("bumpAllLoadedPanels", () => {
  it("bumps every loaded panel", () => {
    const slots = createDefaultSlots(providerIds, WORKSPACE_DEFAULT_SLOT_COUNT)
    const next = bumpAllLoadedPanels(
      slots,
      loaded(["panel-1", "panel-2", "panel-3"]),
    )
    expect(next.map((slot) => slot.reloadGeneration)).toEqual([1, 1, 1])
    expect(next.map((slot) => slot.providerId)).toEqual([
      "chatgpt",
      "claude",
      "gemini",
    ])
    expect(next.map((slot) => slot.id)).toEqual([
      "panel-1",
      "panel-2",
      "panel-3",
    ])
  })

  it("skips a panel that is not in the loaded set", () => {
    const slots = createDefaultSlots(providerIds, WORKSPACE_DEFAULT_SLOT_COUNT)
    const next = bumpAllLoadedPanels(slots, loaded(["panel-1", "panel-3"]))
    expect(next.map((slot) => slot.reloadGeneration)).toEqual([1, 0, 1])
    expect(next[1]).toBe(slots[1])
  })

  it("skips a null provider even when its id is loaded", () => {
    const slots = slotsFromPanelProviders(["chatgpt", null, "gemini"])
    const next = bumpAllLoadedPanels(
      slots,
      loaded(["panel-1", "panel-2", "panel-3"]),
    )
    expect(next.map((slot) => slot.reloadGeneration)).toEqual([1, 0, 1])
    expect(next[1]).toBe(slots[1])
    expect(next[1]?.providerId).toBeNull()
  })

  it("returns the same slots when none are loaded", () => {
    const slots = createDefaultSlots(providerIds, WORKSPACE_DEFAULT_SLOT_COUNT)
    expect(bumpAllLoadedPanels(slots, loaded([]))).toBe(slots)
  })

  it("returns the same slots when every loaded id has no provider", () => {
    const slots = slotsFromPanelProviders([null, null, null])
    expect(
      bumpAllLoadedPanels(slots, loaded(["panel-1", "panel-2", "panel-3"])),
    ).toBe(slots)
  })

  it("increments an already bumped generation instead of resetting it", () => {
    const slots = bumpPanelGeneration(
      bumpPanelGeneration(
        createDefaultSlots(providerIds, WORKSPACE_DEFAULT_SLOT_COUNT),
        "panel-1",
      ),
      "panel-1",
    )
    expect(slots[0]?.reloadGeneration).toBe(2)
    const next = bumpAllLoadedPanels(
      slots,
      loaded(["panel-1", "panel-2", "panel-3"]),
    )
    expect(next.map((slot) => slot.reloadGeneration)).toEqual([3, 1, 1])
  })
})
