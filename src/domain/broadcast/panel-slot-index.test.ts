import { Option } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { panelSlotIndex } from "./panel-slot-index"

describe("panelSlotIndex", () => {
  it("returns the position of the id in the slot list", () => {
    expect(panelSlotIndex(["panel-1", "panel-3"], "panel-3")).toEqual(
      Option.some(1),
    )
  })

  it("returns none for an id absent from the list", () => {
    expect(panelSlotIndex(["panel-1", "panel-3"], "panel-2")).toEqual(
      Option.none(),
    )
  })

  it("returns zero for the first slot", () => {
    expect(panelSlotIndex(["panel-1", "panel-3"], "panel-1")).toEqual(
      Option.some(0),
    )
  })

  it("first match wins on a duplicate id", () => {
    expect(panelSlotIndex(["panel-9", "panel-9"], "panel-9")).toEqual(
      Option.some(0),
    )
  })
})
