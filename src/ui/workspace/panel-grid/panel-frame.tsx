import type { RolePickerOption } from "@ui/workspace/panel-role/model"
import { isOpenInTabEnabled, isRefreshEnabled, type PanelViewState } from "./model"
import { PanelIframeStage } from "./panel-iframe-stage"
import { PanelHeaderView, type PanelHeaderOption } from "./panel-header/view"

export const PanelFrame = (props: {
  panel: PanelViewState
  panelIndex: number
  options: readonly PanelHeaderOption[]
  roleValue: string
  roleOptions: readonly RolePickerOption[]
  roleDisabled: boolean
  onRoleValue: (rawId: string) => void
  onRoleAdd: () => void
  onRoleEdit: () => void
  onLoad: (id: string) => void
  onProviderChange: (rawId: string) => void
  onRefresh: () => void
  onOpenInTab: () => void
  onRemove: () => void
  canRemove: boolean
}) => (
  <section
    data-panel-id={props.panel.id}
    data-provider-id={props.panel.providerId ?? undefined}
    class="panel"
  >
    <PanelHeaderView
      panelIndex={props.panelIndex}
      providerId={props.panel.providerId}
      options={props.options}
      roleValue={props.roleValue}
      roleOptions={props.roleOptions}
      roleDisabled={props.roleDisabled}
      onRoleValue={props.onRoleValue}
      onRoleAdd={props.onRoleAdd}
      onRoleEdit={props.onRoleEdit}
      onProviderChange={props.onProviderChange}
      onRefresh={props.onRefresh}
      isRefreshEnabled={isRefreshEnabled(props.panel)}
      onOpenInTab={props.onOpenInTab}
      isOpenInTabEnabled={isOpenInTabEnabled(props.panel)}
      onRemove={props.onRemove}
      canRemove={props.canRemove}
    />
    <PanelIframeStage
      panelId={props.panel.id}
      title={props.panel.title}
      iconSrc={props.panel.iconSrc}
      src={props.panel.src}
      hasLoaded={props.panel.hasLoaded}
      failed={props.panel.failed}
      errorDetail={props.panel.errorDetail}
      mountKey={`${props.panel.id}:${props.panel.providerId ?? "none"}:${props.panel.reloadGeneration}`}
      onLoad={props.onLoad}
    />
  </section>
)
