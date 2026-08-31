import { describe, expect, it } from "@effect/vitest"
import { layoutPickerItems } from "./model"

describe("layout picker items", () => {
  it("uses ascii ids and times-sign labels", () => {
    expect(layoutPickerItems.map((item) => item.id)).toEqual([
      "1x1",
      "1x2",
      "1x3",
      "2x2",
    ])
    expect(layoutPickerItems.map((item) => item.label)).toEqual([
      "1×1",
      "1×2",
      "1×3",
      "2×2",
    ])
  })
})
