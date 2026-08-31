import { describe, expect, it } from "@effect/vitest"
import { providerIds, type ProviderId } from "@domain/provider/provider-id"
import {
  WORKSPACE_DEFAULT_SLOT_COUNT,
  bumpPanelGeneration,
  createDefaultSlots,
  decodeProviderId,
  iframeSrc,
  labelForProvider,
  reconcileSlotsWithEnabled,
  replacePanelProvider,
  selectOptions,
} from "./model"

describe("panel grid model", () => {
  it("withholds iframe src until framing is ready", () => {
    const url = "https://example.com/chat"
    expect(iframeSrc(false, url)).toBeUndefined()
    expect(iframeSrc(true, url)).toBe(url)
  })

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

  it("decodeProviderId rejects grok, empty, and disabled ids", () => {
    const enabled: readonly ProviderId[] = ["chatgpt", "claude"]
    expect(decodeProviderId("grok", enabled)).toBeNull()
    expect(decodeProviderId("", enabled)).toBeNull()
    expect(decodeProviderId("gemini", enabled)).toBeNull()
    expect(decodeProviderId("chatgpt", enabled)).toBe("chatgpt")
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

  it("labelForProvider and selectOptions use English labels without grok", () => {
    expect(labelForProvider("chatgpt")).toBe("ChatGPT")
    expect(labelForProvider("claude")).toBe("Claude")
    expect(labelForProvider("gemini")).toBe("Gemini")
    const options = selectOptions(providerIds)
    expect(options.map((option) => option.label)).toEqual([
      "ChatGPT",
      "Claude",
      "Gemini",
    ])
    expect(options.map((option) => option.id)).toEqual(providerIds)
    expect(
      selectOptions(["gemini", "chatgpt"]).map((option) => option.id),
    ).toEqual(["chatgpt", "gemini"])
  })
})
