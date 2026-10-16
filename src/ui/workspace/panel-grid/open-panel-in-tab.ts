import { Array, Effect, Option } from "effect"
import type { PanelTarget } from "@domain/broadcast/panel-target"
import type { Messaging } from "@domain/ports/messaging"
import type { Tabs } from "@domain/ports/tabs"
import { openProviderTab } from "@domain/workspace/open-provider-tab"
import type { PanelSlot, PanelViewState } from "./model"

export const openPanelInTab = (input: {
  readonly panelId: string
  readonly slots: readonly PanelSlot[]
  readonly panels: readonly PanelViewState[]
  readonly frames: readonly PanelTarget[]
}): Effect.Effect<void, never, Tabs | Messaging> => {
  const slot = input.slots.find((item) => item.id === input.panelId)
  if (slot === undefined || slot.providerId === null) {
    return Effect.void
  }
  const providerId = slot.providerId
  const frame = Array.findFirst(
    input.frames,
    (target) =>
      target.panelId === input.panelId && target.providerId === providerId,
  )
  const assignedSrc = input.panels.find(
    (panel) => panel.id === input.panelId,
  )?.src
  return Effect.log("open panel in tab", input.panelId).pipe(
    Effect.zipRight(
      openProviderTab({
        providerId,
        assignedSrc,
        frame,
      }),
    ),
    Effect.tap((chosen) =>
      Option.match(chosen, {
        onNone: () => Effect.void,
        onSome: (href) => Effect.log("opened provider tab", href),
      }),
    ),
    Effect.catchTag("TabCreateFailed", (error) =>
      Effect.logWarning("open panel in tab failed", error.message),
    ),
    Effect.asVoid,
  )
}
