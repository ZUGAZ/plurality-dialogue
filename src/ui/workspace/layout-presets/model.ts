import { presetById, type LayoutId } from "@domain/layout/presets"

export type { LayoutId }

export type LayoutPickerItem = {
  readonly id: LayoutId
  readonly label: string
  readonly columnCount: number
  readonly rowCount: number
}

const layoutLabels: { readonly [Id in LayoutId]: string } = {
  "1x1": "1×1",
  "1x2": "1×2",
  "1x3": "1×3",
  "1x4": "1×4",
  "2x2": "2×2",
}

const pickerOrder: readonly LayoutId[] = [
  "1x1",
  "1x2",
  "1x3",
  "1x4",
  "2x2",
]

export const layoutPickerItems: readonly LayoutPickerItem[] =
  pickerOrder.map((id) => {
    const grid = presetById(id)
    return {
      id: grid.id,
      label: layoutLabels[grid.id],
      columnCount: grid.columnCount,
      rowCount: grid.rowCount,
    }
  })

export const previewCellIndices = (
  item: LayoutPickerItem,
): readonly number[] =>
  Array.from(
    { length: item.columnCount * item.rowCount },
    (_, index) => index,
  )
