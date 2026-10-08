import { Layer } from "effect"
import { ChromeMessagingLive } from "./chrome/messaging-live"
import { ChromeStorageLive } from "./chrome/storage"
import { ChromeTabsLive } from "./chrome/tabs"
import { IndexedDbPromptLibraryLive } from "./indexed-db/prompt-library"
import { SpanLoggerLive } from "./logging/span-logger"

export const workspaceLive = Layer.mergeAll(
  ChromeStorageLive,
  ChromeTabsLive,
  ChromeMessagingLive,
  IndexedDbPromptLibraryLive,
  SpanLoggerLive,
)

export const optionsLive = Layer.mergeAll(ChromeStorageLive, SpanLoggerLive)

export const backgroundLive = Layer.mergeAll(
  ChromeStorageLive,
  ChromeTabsLive,
  SpanLoggerLive,
)

export { chatgptContentLayer } from "./providers/chatgpt/fill-send"
export { claudeContentLayer } from "./providers/claude/fill-send"
export { geminiContentLayer } from "./providers/gemini/fill-send"
