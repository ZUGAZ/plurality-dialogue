import { Show } from "solid-js"
import { LoadingOverlay } from "./loading-overlay"
import { isHttpsIframeSrc, type PanelViewState } from "./model"

export const PanelFrame = (props: {
  panel: PanelViewState
  onLoad: (id: string) => void
}) => (
  <section data-panel-id={props.panel.id} class="panel">
    <div data-panel-header></div>
    <div data-panel-stage class="panel-stage">
      <LoadingOverlay
        title={props.panel.title}
        iconSrc={props.panel.iconSrc}
        visible={props.panel.failed || !props.panel.hasLoaded}
        failed={props.panel.failed}
      />
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
    </div>
  </section>
)

const httpsSrc = (src: string | undefined): string | undefined =>
  isHttpsIframeSrc(src) ? src : undefined
