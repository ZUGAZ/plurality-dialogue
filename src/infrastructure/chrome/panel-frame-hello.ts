import { Either, Schema } from "effect"
import { PanelTarget } from "../../domain/broadcast/panel-target"
import { PanelFrameReady } from "../../domain/messaging/panel-frame-ready"
import {
  subscribeRuntimeMessageEffects,
  type RunPromise,
} from "./runtime-messaging"

export const ingestPanelFrameReady = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  workspaceTabId: number,
  upsert: (hello: PanelTarget) => void,
): void => {
  const decoded = Schema.decodeUnknownEither(PanelFrameReady)(message)
  Either.match(decoded, {
    onLeft: () => undefined,
    onRight: (ready) => {
      if (sender.tab?.id !== workspaceTabId) {
        return
      }
      if (sender.frameId === undefined) {
        return
      }
      upsert(
        PanelTarget.make({
          panelId: ready.panelId,
          providerId: ready.providerId,
          tabId: workspaceTabId,
          frameId: sender.frameId,
        }),
      )
    },
  })
}

export const subscribeWorkspacePanelHellos = <Requirements>(
  workspaceTabId: number,
  upsert: (hello: PanelTarget) => void,
  run: RunPromise<Requirements>,
): void => {
  subscribeRuntimeMessageEffects(
    (message, sender) => {
      ingestPanelFrameReady(message, sender, workspaceTabId, upsert)
      return undefined
    },
    run,
  )
}
