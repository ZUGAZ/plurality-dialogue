import { Layer } from "effect"
import { ChromeMessagingLive } from "./chrome/messaging-live"
import { ChromeStorageLive } from "./chrome/storage"
import { ChromeTabsLive } from "./chrome/tabs"

export const workspaceLive = Layer.mergeAll(
  ChromeStorageLive,
  ChromeTabsLive,
  ChromeMessagingLive,
)

export const optionsLive = ChromeStorageLive

export { chatgptContentLayer } from "./providers/chatgpt/fill-send"
export { claudeContentLayer } from "./providers/claude/fill-send"
export { geminiContentLayer } from "./providers/gemini/fill-send"
