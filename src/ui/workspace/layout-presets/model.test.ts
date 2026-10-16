import { describe, expect, it } from "@effect/vitest"
import { layoutPickerItems, previewCellIndices } from "./model"

describe("layout picker items", () => {
  it("lists 1xN before multi-row presets with times-sign labels", () => {
    expect(layoutPickerItems.map((item) => item.id)).toEqual([
      "1x1",
      "1x2",
      "1x3",
      "1x4",
      "1x5",
      "1x6",
      "2x2",
      "2x3",
    ])
    expect(layoutPickerItems.map((item) => item.label)).toEqual([
      "1×1",
      "1×2",
      "1×3",
      "1×4",
      "1×5",
      "1×6",
      "2×2",
      "2×3",
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
    const oneByFive = layoutPickerItems[4]
    expect(oneByFive).toEqual({
      id: "1x5",
      label: "1×5",
      columnCount: 5,
      rowCount: 1,
    })
    if (oneByFive !== undefined) {
      expect(previewCellIndices(oneByFive)).toEqual([0, 1, 2, 3, 4])
    }
    const oneBySix = layoutPickerItems[5]
    expect(oneBySix).toEqual({
      id: "1x6",
      label: "1×6",
      columnCount: 6,
      rowCount: 1,
    })
    if (oneBySix !== undefined) {
      expect(previewCellIndices(oneBySix)).toEqual([0, 1, 2, 3, 4, 5])
    }
    const twoByThree = layoutPickerItems[7]
    expect(twoByThree).toEqual({
      id: "2x3",
      label: "2×3",
      columnCount: 3,
      rowCount: 2,
    })
    if (twoByThree !== undefined) {
      expect(previewCellIndices(twoByThree)).toEqual([0, 1, 2, 3, 4, 5])
    }
  })
})
