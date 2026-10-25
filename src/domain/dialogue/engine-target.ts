import type { ProviderId } from "../provider/provider-id"
import type { VisiblePanel } from "../broadcast/resolve-targets"
import { PanelTarget } from "../broadcast/panel-target"

export const engineVisiblePanel = (
  panelId: string,
  providerId: ProviderId,
): VisiblePanel => ({
  panelId,
  providerId,
})

// Same rule as one row of resolveBroadcastTargets: a hello for this panelId
// is enough. The seat's providerId wins over whatever the frame announced.
export const resolveEngineTarget = (
  panelId: string,
  providerId: ProviderId,
  frames: ReadonlyArray<PanelTarget>,
): PanelTarget | undefined => {
  let hello: PanelTarget | undefined
  for (const frame of frames) {
    if (frame.panelId === panelId) {
      hello = frame
    }
  }
  if (hello === undefined) {
    return undefined
  }
  return PanelTarget.make({
    panelId,
    providerId,
    tabId: hello.tabId,
    frameId: hello.frameId,
  })
}
