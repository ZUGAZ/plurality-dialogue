import { For, Show } from "solid-js"
import { isHttpsIframeSrc } from "./model"
import { LoadingOverlay } from "./loading-overlay"

export const PanelIframeStage = (props: {
  panelId: string
  title: string
  iconSrc?: string
  src: string | undefined
  hasLoaded: boolean
  failed: boolean
  errorDetail?: string
  mountKey: string
  onLoad: (id: string) => void
}) => (
  <div data-panel-stage class="panel-stage">
    <LoadingOverlay
      title={props.title}
      iconSrc={props.iconSrc}
      visible={props.failed || !props.hasLoaded}
      failed={props.failed}
      detail={props.errorDetail}
    />
    <For each={iframeMountKeys(props.src, props.mountKey)}>
      {(_mountKey) => (
        <Show when={httpsSrc(props.src)}>
          {(src) => (
            <iframe
              name={props.panelId}
              title={props.title}
              src={src()}
              width="100%"
              height="100%"
              style={{ border: "0" }}
              onLoad={() => props.onLoad(props.panelId)}
            />
          )}
        </Show>
      )}
    </For>
  </div>
)

const httpsSrc = (src: string | undefined): string | undefined =>
  isHttpsIframeSrc(src) ? src : undefined

const iframeMountKeys = (
  src: string | undefined,
  mountKey: string,
): readonly string[] => (isHttpsIframeSrc(src) ? [mountKey] : [])
