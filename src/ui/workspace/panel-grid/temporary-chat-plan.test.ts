import { describe, expect, it } from "@effect/vitest"
import {
  dropClaimedPanels,
  planTemporaryChatEntry,
} from "./temporary-chat-plan"

const frame = (panelId: string, frameId: number) => ({ panelId, frameId })

const panel = (id: string, reloadGeneration: number) => ({
  id,
  reloadGeneration,
})

describe("temporary chat plan", () => {
  it("flag off sends nothing and returns the same claim set", () => {
    const claimed = new Set(["panel-1:0:10"])
    const plan = planTemporaryChatEntry({
      enabled: false,
      claimed,
      frames: [frame("panel-1", 10)],
      panels: [panel("panel-1", 0)],
    })
    expect(plan.targets).toEqual([])
    expect(plan.claimed).toBe(claimed)
  })

  it("claims an unclaimed frame and skips the same key", () => {
    const frames = [frame("panel-1", 10)]
    const panels = [panel("panel-1", 0)]
    const first = planTemporaryChatEntry({
      enabled: true,
      claimed: new Set(),
      frames,
      panels,
    })
    expect(first.targets).toEqual(frames)
    expect(first.claimed.has("panel-1:0:10")).toBe(true)
    const second = planTemporaryChatEntry({
      enabled: true,
      claimed: first.claimed,
      frames,
      panels,
    })
    expect(second.targets).toEqual([])
  })

  it("a new reloadGeneration sends again", () => {
    const nextFrame = frame("panel-1", 10)
    const plan = planTemporaryChatEntry({
      enabled: true,
      claimed: new Set(["panel-1:0:10"]),
      frames: [nextFrame],
      panels: [panel("panel-1", 1)],
    })
    expect(plan.targets).toEqual([nextFrame])
    expect(plan.claimed.has("panel-1:1:10")).toBe(true)
  })

  it("skips a frame with no panel row", () => {
    const plan = planTemporaryChatEntry({
      enabled: true,
      claimed: new Set(),
      frames: [frame("panel-9", 4)],
      panels: [panel("panel-1", 0)],
    })
    expect(plan.targets).toEqual([])
    expect(plan.claimed.size).toBe(0)
  })

  it("dropClaimedPanels for panel-1 keeps panel-10", () => {
    const next = dropClaimedPanels(
      new Set(["panel-1:0:10", "panel-10:0:11"]),
      ["panel-1"],
    )
    expect([...next]).toEqual(["panel-10:0:11"])
  })
})
