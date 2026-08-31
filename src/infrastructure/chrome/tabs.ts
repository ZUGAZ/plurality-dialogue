import { Effect, Either, Layer, pipe } from "effect"
import { TabMessageFailed } from "../../domain/broadcast/errors"
import { Tabs } from "../../domain/ports/tabs"
import { parseWorkspaceTabId } from "../../domain/workspace/framing-session-rules"
import { TabIdUnavailable } from "../../domain/workspace/tab-id-unavailable"

export const ChromeTabsLive = Layer.succeed(Tabs, {
  currentTabId: () =>
    Effect.tryPromise({
      try: () => chrome.tabs.getCurrent(),
      catch: () => new TabIdUnavailable(),
    }).pipe(
      Effect.flatMap((tab) =>
        pipe(
          parseWorkspaceTabId(tab?.id),
          Either.match({
            onLeft: (error) => Effect.fail(error),
            onRight: (id) => Effect.succeed(id),
          }),
        ),
      ),
    ),
})

export const sendMessageToFrame = (
  tabId: number,
  frameId: number,
  message: unknown,
): Effect.Effect<unknown, TabMessageFailed> =>
  Effect.tryPromise({
    try: () => chrome.tabs.sendMessage(tabId, message, { frameId }),
    catch: (cause) => new TabMessageFailed({ cause }),
  })

export const subscribeTabRemoved = (
  onRemoved: (tabId: number) => void,
): void => {
  chrome.tabs.onRemoved.addListener((tabId) => {
    onRemoved(tabId)
  })
}
