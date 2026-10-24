import { layoutPickerItems, type LayoutId } from "./layout-presets/model"
import { LayoutPresetsView } from "./layout-presets/view"
import type { PanelViewState, ProviderOption } from "./panel-grid/model"
import { PanelGridView } from "./panel-grid/view"
import { PanelRoleAlert } from "./panel-role/alert"
import { PanelRoleForm, type PanelRoleFormProps } from "./panel-role/form"
import type { RolePickerOption } from "./panel-role/model"
import {
  PromptLibraryDialog,
  type PromptLibraryDialogProps,
} from "./prompt-library/dialog"
import { AddPanelButton } from "./shell/add-panel-button"
import { NewChatButton } from "./shell/new-chat-button"
import { TemporaryChatToggle } from "./shell/temporary-chat-toggle"
import { WorkspaceShell } from "./shell/view"
import { UnifiedInputContainer } from "./unified-input/container"
import type { UnifiedInputViewProps } from "./unified-input/view"
import "./panel-role/view.css"
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
  readonly openPanelInTab: (panelId: string) => void
  readonly onNewChat: () => void
  readonly temporaryChat: () => boolean
  readonly onToggleTemporaryChat: () => void
  readonly collapsed: () => boolean
  readonly onToggleCollapse: () => void
  readonly unifiedInput: UnifiedInputViewProps
  readonly promptLibrary: PromptLibraryDialogProps
  readonly panelRoleForm: PanelRoleFormProps
  readonly roleBannerError: () => string | undefined
  readonly roleOptions: () => readonly RolePickerOption[]
  readonly roleDisabled: () => boolean
  readonly roleIdAt: (slotIndex: number) => string
  readonly onRoleValue: (slotIndex: number, rawId: string) => void
  readonly onRoleAdd: (slotIndex: number) => void
  readonly onRoleEdit: (slotIndex: number, roleId: string) => void
}

export const WorkspaceView = (props: WorkspaceViewProps) => (
  <div class="workspace">
    <WorkspaceShell
      collapsed={props.collapsed}
      onToggleCollapse={props.onToggleCollapse}
    >
      <NewChatButton onClick={props.onNewChat} />
      <TemporaryChatToggle
        pressed={props.temporaryChat}
        onToggle={props.onToggleTemporaryChat}
      />
      <AddPanelButton canAdd={props.canAddPanel()} onAdd={props.addPanel} />
      <LayoutPresetsView
        items={layoutPickerItems}
        selectedId={props.layoutId()}
        onSelect={props.onSelectLayout}
      />
    </WorkspaceShell>
    <PanelRoleAlert error={props.roleBannerError} />
    <PanelGridView
      panels={props.panels}
      options={props.options}
      layoutId={props.layoutId}
      layoutColumns={props.layoutColumns}
      layoutRows={props.layoutRows}
      canRemovePanel={props.canRemovePanel}
      roleOptions={props.roleOptions}
      roleDisabled={props.roleDisabled}
      roleIdAt={props.roleIdAt}
      onRoleValue={props.onRoleValue}
      onRoleAdd={props.onRoleAdd}
      onRoleEdit={props.onRoleEdit}
      onPanelLoad={props.onPanelLoad}
      setPanelProvider={props.setPanelProvider}
      refreshPanel={props.refreshPanel}
      openPanelInTab={props.openPanelInTab}
      removePanel={props.removePanel}
    />
    <UnifiedInputContainer {...props.unifiedInput} />
    <PromptLibraryDialog {...props.promptLibrary} />
    <PanelRoleForm {...props.panelRoleForm} />
  </div>
)
