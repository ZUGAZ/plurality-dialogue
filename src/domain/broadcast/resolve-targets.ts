import type { ProviderId } from "../provider/provider-id"
import { PanelFailed } from "./panel-failed"
import { PanelTarget } from "./panel-target"

export type VisiblePanel = {
  readonly panelId: string
  readonly providerId: ProviderId
}

export type BroadcastPlan = {
  readonly targets: ReadonlyArray<PanelTarget>
  readonly notReady: ReadonlyArray<PanelFailed>
}

export const toVisiblePanels = (
  panels: ReadonlyArray<{
    readonly id: string
    readonly providerId: ProviderId | null
  }>,
): ReadonlyArray<VisiblePanel> => {
  const visible: VisiblePanel[] = []
  for (const panel of panels) {
    if (panel.providerId !== null) {
      visible.push({ panelId: panel.id, providerId: panel.providerId })
    }
  }
  return visible
}

export const upsertFrameHello = (
  rows: ReadonlyArray<PanelTarget>,
  incoming: PanelTarget,
): ReadonlyArray<PanelTarget> => [
  ...rows.filter(
    (row) =>
      row.frameId !== incoming.frameId && row.panelId !== incoming.panelId,
  ),
  incoming,
]

export const resolveBroadcastTargets = (
  visible: ReadonlyArray<VisiblePanel>,
  hellos: ReadonlyArray<PanelTarget>,
): BroadcastPlan => {
  const helloByPanelId = new Map<string, PanelTarget>()
  for (const hello of hellos) {
    helloByPanelId.set(hello.panelId, hello)
  }
  const targets: PanelTarget[] = []
  const notReady: PanelFailed[] = []
  for (const panel of visible) {
    const hello = helloByPanelId.get(panel.panelId)
    if (hello === undefined) {
      notReady.push(
        PanelFailed.make({
          panelId: panel.panelId,
          providerId: panel.providerId,
          reason: "frame-not-ready",
        }),
      )
      continue
    }
    targets.push(
      PanelTarget.make({
        panelId: panel.panelId,
        providerId: panel.providerId,
        tabId: hello.tabId,
        frameId: hello.frameId,
      }),
    )
  }
  return { targets, notReady }
}
