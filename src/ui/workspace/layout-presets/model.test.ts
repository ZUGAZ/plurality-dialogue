import { describe, expect, it } from "@effect/vitest"
import { layoutPickerItems, previewCellIndices } from "./model"

describe("layout picker items", () => {
  it("lists 1xN before 2x2 with times-sign labels", () => {
    expect(layoutPickerItems.map((item) => item.id)).toEqual([
      "1x1",
      "1x2",
      "1x3",
      "1x4",
      "2x2",
    ])
    expect(layoutPickerItems.map((item) => item.label)).toEqual([
      "1×1",
      "1×2",
      "1×3",
      "1×4",
      "2×2",
    ])
    const oneByFour = layoutPickerItems[3]
    expect(oneByFour).toEqual({
      id: "1x4",
      label: "1×4",
      columnCount: 4,
      rowCount: 1,
    })
    if (oneByFour !== undefined) {
      expect(previewCellIndices(oneByFour)).toEqual([0, 1, 2, 3])
    }
  })
})
