import { layoutPickerItems, type LayoutId } from "./layout-presets/model"
import { LayoutPresetsView } from "./layout-presets/view"
import type { PanelViewState, ProviderOption } from "./panel-grid/model"
import { PanelGridView } from "./panel-grid/view"
import { AddPanelButton } from "./shell/add-panel-button"
import { NewChatButton } from "./shell/new-chat-button"
import { WorkspaceShell } from "./shell/view"
import { UnifiedInputContainer } from "./unified-input/container"
import type { UnifiedInputViewProps } from "./unified-input/view"
import "./view.css"

export type WorkspaceViewProps = {
  readonly panels: () => readonly PanelViewState[]
  readonly options: () => readonly ProviderOption[]
  readonly layoutId: () => LayoutId
  readonly layoutColumns: () => number
  readonly layoutRows: () => number
  readonly onPanelLoad: (id: string) => void
  readonly onSelectLayout: (id: LayoutId) => void
  readonly addPanel: () => void
  readonly removePanel: (panelId: string) => void
  readonly canAddPanel: () => boolean
  readonly canRemovePanel: () => boolean
  readonly setPanelProvider: (panelId: string, rawId: string) => void
  readonly refreshPanel: (panelId: string) => void
  readonly onNewChat: () => void
  readonly collapsed: () => boolean
  readonly onToggleCollapse: () => void
  readonly unifiedInput: UnifiedInputViewProps
}

export const WorkspaceView = (props: WorkspaceViewProps) => (
  <div class="workspace">
    <WorkspaceShell
      collapsed={props.collapsed}
      onToggleCollapse={props.onToggleCollapse}
    >
      <NewChatButton onClick={props.onNewChat} />
      <AddPanelButton canAdd={props.canAddPanel()} onAdd={props.addPanel} />
      <LayoutPresetsView
        items={layoutPickerItems}
        selectedId={props.layoutId()}
        onSelect={props.onSelectLayout}
      />
    </WorkspaceShell>
    <PanelGridView
      panels={props.panels}
      options={props.options}
      layoutId={props.layoutId}
      layoutColumns={props.layoutColumns}
      layoutRows={props.layoutRows}
      canRemovePanel={props.canRemovePanel}
      onPanelLoad={props.onPanelLoad}
      setPanelProvider={props.setPanelProvider}
      refreshPanel={props.refreshPanel}
      removePanel={props.removePanel}
    />
    <UnifiedInputContainer {...props.unifiedInput} />
  </div>
)
