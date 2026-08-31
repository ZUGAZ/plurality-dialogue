import { Array, Effect, Either, Layer, Option, Schema, pipe } from "effect"
import { TabMessageFailed } from "../../domain/broadcast/errors"
import {
  OpenTab,
  TabCreateFailed,
  TabFocusFailed,
  TabQueryFailed,
  Tabs,
} from "../../domain/ports/tabs"
import { parseWorkspaceTabId } from "../../domain/workspace/framing-session-rules"
import { TabIdUnavailable } from "../../domain/workspace/tab-id-unavailable"

const ChromeTabContext = Schema.Struct({
  tabId: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  windowId: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
})

const messageFromCause = (cause: unknown, fallback: string): string => {
  if (cause instanceof Error && cause.message.length > 0) {
    return cause.message
  }
  return fallback
}

const openTabFromContext = (context: unknown): Option.Option<OpenTab> =>
  pipe(
    Schema.decodeUnknownEither(ChromeTabContext)(context),
    Either.match({
      onLeft: () => Option.none(),
      onRight: (decoded) =>
        pipe(
          Schema.decodeUnknownEither(OpenTab)({
            id: decoded.tabId,
            windowId: decoded.windowId,
          }),
          Either.match({
            onLeft: () => Option.none(),
            onRight: Option.some,
          }),
        ),
    }),
  )

const openTabsFromPayload = (
  payload: unknown,
): Effect.Effect<readonly OpenTab[], TabQueryFailed> =>
  pipe(
    Schema.decodeUnknownEither(Schema.Array(Schema.Unknown))(payload),
    Either.match({
      onLeft: () =>
        Effect.fail(
          new TabQueryFailed({ message: "Unexpected getContexts payload" }),
        ),
      onRight: (contexts) =>
        Effect.succeed(
          Array.dedupeWith(
            Array.filterMap(contexts, openTabFromContext),
            (left, right) => left.id === right.id,
          ),
        ),
    }),
  )

const currentTabId = () =>
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
  )

const queryByUrl = (url: string) =>
  Effect.tryPromise({
    try: () =>
      // Chrome does not honor tabs.query url filter on chrome-extension://
      // pages without the tabs permission. getContexts matches own-origin
      // documents without that permission.
      chrome.runtime.getContexts({
        contextTypes: ["TAB"],
        documentUrls: [url],
      }),
    catch: (cause) =>
      new TabQueryFailed({
        message: messageFromCause(cause, "Tab query failed"),
      }),
  }).pipe(Effect.flatMap(openTabsFromPayload))

const createTab = (url: string) =>
  Effect.tryPromise({
    try: () => chrome.tabs.create({ url, active: true }),
    catch: (cause) =>
      new TabCreateFailed({
        message: messageFromCause(cause, "Tab create failed"),
      }),
  }).pipe(
    Effect.flatMap((tab) =>
      pipe(
        Schema.decodeUnknownEither(OpenTab)({
          id: tab.id,
          windowId: tab.windowId,
        }),
        Either.match({
          onLeft: () =>
            Effect.fail(
              new TabCreateFailed({
                message: "Created tab is missing a valid id or windowId",
              }),
            ),
          onRight: (openTab) => Effect.succeed(openTab),
        }),
      ),
    ),
  )

const focusTab = (tab: OpenTab) =>
  Effect.tryPromise({
    try: async () => {
      await chrome.tabs.update(tab.id, { active: true })
      await chrome.windows.update(tab.windowId, { focused: true })
    },
    catch: (cause) =>
      new TabFocusFailed({
        message: messageFromCause(cause, "Tab focus failed"),
      }),
  })

export const ChromeTabsLive = Layer.succeed(Tabs, {
  currentTabId,
  queryByUrl,
  create: createTab,
  focus: focusTab,
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
