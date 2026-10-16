import { Option } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  cellCount,
  defaultLayoutId,
  is1xN,
  isLayoutId,
  layoutIdForCellCount,
  layoutIdForCellCountOnTrack,
  layoutIdOrDefault,
  maxCellCount,
  layoutPresets,
  presetById,
  providerAt,
} from "./presets"

describe("layout presets", () => {
  it("exposes exactly eight ascii ids and defaults to 1x3", () => {
    expect(layoutPresets.map((preset) => preset.id)).toEqual([
      "1x1",
      "1x2",
      "1x3",
      "2x2",
      "1x4",
      "1x5",
      "1x6",
      "2x3",
    ])
    expect(defaultLayoutId).toBe("1x3")
    expect(isLayoutId("1x1")).toBe(true)
    expect(isLayoutId("1x2")).toBe(true)
    expect(isLayoutId("1x3")).toBe(true)
    expect(isLayoutId("2x2")).toBe(true)
    expect(isLayoutId("1x4")).toBe(true)
    expect(isLayoutId("1x5")).toBe(true)
    expect(isLayoutId("1x6")).toBe(true)
    expect(isLayoutId("2x3")).toBe(true)
    expect(isLayoutId("1x7")).toBe(false)
  })

  it("uses cell counts 1, 2, 3, 4, 4, 5, 6, 6", () => {
    expect(layoutPresets.map(cellCount)).toEqual([1, 2, 3, 4, 4, 5, 6, 6])
    expect(presetById("1x1")).toEqual({
      id: "1x1",
      columnCount: 1,
      rowCount: 1,
    })
    expect(presetById("1x2")).toEqual({
      id: "1x2",
      columnCount: 2,
      rowCount: 1,
    })
    expect(presetById("1x3")).toEqual({
      id: "1x3",
      columnCount: 3,
      rowCount: 1,
    })
    expect(presetById("2x2")).toEqual({
      id: "2x2",
      columnCount: 2,
      rowCount: 2,
    })
    expect(presetById("1x4")).toEqual({
      id: "1x4",
      columnCount: 4,
      rowCount: 1,
    })
    expect(presetById("1x5")).toEqual({
      id: "1x5",
      columnCount: 5,
      rowCount: 1,
    })
    expect(presetById("1x6")).toEqual({
      id: "1x6",
      columnCount: 6,
      rowCount: 1,
    })
    expect(presetById("2x3")).toEqual({
      id: "2x3",
      columnCount: 3,
      rowCount: 2,
    })
  })

  it("layoutIdOrDefault accepts the eight ids and falls back otherwise", () => {
    expect(layoutIdOrDefault("1x1")).toBe("1x1")
    expect(layoutIdOrDefault("1x2")).toBe("1x2")
    expect(layoutIdOrDefault("1x3")).toBe("1x3")
    expect(layoutIdOrDefault("2x2")).toBe("2x2")
    expect(layoutIdOrDefault("1x4")).toBe("1x4")
    expect(layoutIdOrDefault("1x5")).toBe("1x5")
    expect(layoutIdOrDefault("1x6")).toBe("1x6")
    expect(layoutIdOrDefault("2x3")).toBe("2x3")
    expect(layoutIdOrDefault("1x7")).toBe("1x3")
    expect(layoutIdOrDefault("1x12")).toBe("1x3")
    expect(layoutIdOrDefault("1×6")).toBe("1x3")
    expect(layoutIdOrDefault("")).toBe("1x3")
    expect(layoutIdOrDefault(null)).toBe("1x3")
    expect(layoutIdOrDefault({})).toBe("1x3")
  })

  it("layoutIdForCellCount maps 1..6 and falls back to the default", () => {
    expect(layoutIdForCellCount(1)).toBe("1x1")
    expect(layoutIdForCellCount(2)).toBe("1x2")
    expect(layoutIdForCellCount(3)).toBe("1x3")
    expect(layoutIdForCellCount(4)).toBe("2x2")
    expect(layoutIdForCellCount(5)).toBe("1x5")
    expect(layoutIdForCellCount(6)).toBe("1x6")
    expect(layoutIdForCellCount(0)).toBe(defaultLayoutId)
    expect(layoutIdForCellCount(7)).toBe(defaultLayoutId)
    expect(layoutPresets).toHaveLength(8)
    expect(maxCellCount).toBe(6)
  })

  it("is1xN is true for a single row and false for two rows", () => {
    expect(is1xN("1x1")).toBe(true)
    expect(is1xN("1x2")).toBe(true)
    expect(is1xN("1x3")).toBe(true)
    expect(is1xN("1x4")).toBe(true)
    expect(is1xN("1x5")).toBe(true)
    expect(is1xN("1x6")).toBe(true)
    expect(is1xN("2x2")).toBe(false)
    expect(is1xN("2x3")).toBe(false)
  })

  it("layoutIdForCellCountOnTrack stays on 1xN and otherwise falls through", () => {
    expect(layoutIdForCellCountOnTrack(4, "1x3")).toBe("1x4")
    expect(layoutIdForCellCountOnTrack(4, "1x2")).toBe("1x4")
    expect(layoutIdForCellCountOnTrack(4, "2x2")).toBe("2x2")
    expect(layoutIdForCellCountOnTrack(3, "1x4")).toBe("1x3")
    expect(layoutIdForCellCountOnTrack(3, "2x2")).toBe("1x3")
    expect(layoutIdForCellCountOnTrack(1, "1x4")).toBe("1x1")
    expect(layoutIdForCellCountOnTrack(5, "1x4")).toBe("1x5")
    expect(layoutIdForCellCountOnTrack(6, "1x5")).toBe("1x6")
    expect(layoutIdForCellCountOnTrack(5, "1x6")).toBe("1x5")
    expect(layoutIdForCellCountOnTrack(4, "1x5")).toBe("1x4")
    expect(layoutIdForCellCountOnTrack(6, "2x2")).toBe("1x6")
    expect(layoutIdForCellCountOnTrack(5, "2x3")).toBe("1x5")
    expect(layoutIdForCellCountOnTrack(7, "1x6")).toBe("1x3")
  })

  it("providerAt cycles enabled ids and is none when empty", () => {
    expect(
      providerAt(["chatgpt", "claude", "gemini"], 3),
    ).toEqual(Option.some("chatgpt"))
    expect(providerAt(["chatgpt"], 2)).toEqual(Option.some("chatgpt"))
    expect(providerAt([], 0)).toEqual(Option.none())
  })
})
