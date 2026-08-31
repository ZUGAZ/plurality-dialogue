import { Layer } from "effect"
import { ChromeMessagingLive } from "./chrome/runtime-messaging"
import { ChromeStorageLive } from "./chrome/storage"
import { ChromeTabsLive } from "./chrome/tabs"

export const workspaceLive = Layer.mergeAll(
  ChromeStorageLive,
  ChromeTabsLive,
  ChromeMessagingLive,
)

export const optionsLive = ChromeStorageLive
