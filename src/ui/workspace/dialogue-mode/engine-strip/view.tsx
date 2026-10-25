import { For } from "solid-js"
import { PanelIframeStage } from "../../panel-grid/panel-iframe-stage"
import type { EngineStripItem } from "./model"

export const EngineStrip = (props: {
  rows: () => readonly EngineStripItem[]
  onLoad: (panelId: string) => void
}) => (
  <div class="dialogue-engine-strip" data-dialogue-engines>
    <For each={props.rows()}>
      {(row) => (
        <div
          class="dialogue-engine"
          data-panel-id={row.panelId}
          data-provider-id={row.providerId}
        >
          <PanelIframeStage
            panelId={row.panelId}
            title={row.title}
            src={row.src}
            hasLoaded={row.hasLoaded}
            failed={row.failed}
            mountKey={row.mountKey}
            onLoad={props.onLoad}
          />
        </div>
      )}
    </For>
  </div>
)
