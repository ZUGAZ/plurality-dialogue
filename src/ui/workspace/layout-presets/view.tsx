import { For } from "solid-js"
import {
  previewCellIndices,
  type LayoutId,
  type LayoutPickerItem,
} from "./model"
import "./layout-presets.css"

export const LayoutPresetsView = (props: {
  items: readonly LayoutPickerItem[]
  selectedId: LayoutId
  onSelect: (id: LayoutId) => void
}) => (
  <div role="group" aria-label="Layout" class="layout-presets">
    <For each={props.items}>
      {(item) => (
        <button
          type="button"
          class="layout-preset"
          aria-pressed={props.selectedId === item.id}
          onClick={() => props.onSelect(item.id)}
        >
          <span
            class="layout-preset-preview"
            aria-hidden="true"
            style={{
              "--preview-columns": String(item.columnCount),
              "--preview-rows": String(item.rowCount),
            }}
          >
            <For each={previewCellIndices(item)}>
              {(_cellIndex) => <span class="layout-preset-preview-cell" />}
            </For>
          </span>
          <span class="layout-preset-label">{item.label}</span>
        </button>
      )}
    </For>
  </div>
)
