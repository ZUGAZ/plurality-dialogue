import { For, Show } from "solid-js"
import {
  isHttpsIframeSrc,
  isRefreshEnabled,
  type PanelViewState,
} from "./model"
import { LoadingOverlay } from "./loading-overlay"
import {
  PanelHeaderView,
  type PanelHeaderOption,
} from "./panel-header/view"

export const PanelFrame = (props: {
  panel: PanelViewState
  panelIndex: number
  options: readonly PanelHeaderOption[]
  onLoad: (id: string) => void
  onProviderChange: (rawId: string) => void
  onRefresh: () => void
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
      onProviderChange={props.onProviderChange}
      onRefresh={props.onRefresh}
      isRefreshEnabled={isRefreshEnabled(props.panel)}
    />
    <div data-panel-stage class="panel-stage">
      <LoadingOverlay
        title={props.panel.title}
        iconSrc={props.panel.iconSrc}
        visible={props.panel.failed || !props.panel.hasLoaded}
        failed={props.panel.failed}
      />
      <For each={iframeMountKeys(props.panel)}>
        {(_mountKey) => (
          <Show when={httpsSrc(props.panel.src)}>
            {(src) => (
              <iframe
                name={props.panel.id}
                title={props.panel.title}
                src={src()}
                width="100%"
                height="100%"
                style={{ border: "0" }}
                onLoad={() => props.onLoad(props.panel.id)}
              />
            )}
          </Show>
        )}
      </For>
    </div>
  </section>
)

const httpsSrc = (src: string | undefined): string | undefined =>
  isHttpsIframeSrc(src) ? src : undefined

const iframeMountKeys = (panel: PanelViewState): readonly string[] =>
  isHttpsIframeSrc(panel.src)
    ? [
        `${panel.id}:${panel.providerId ?? "none"}:${panel.reloadGeneration}`,
      ]
    : []
