import type { Effect } from "effect"
import { Context } from "effect"
import type { TabIdUnavailable } from "../workspace/tab-id-unavailable"

/**
 * Live `currentTabId` is `chrome.tabs.getCurrent()` in the workspace page.
 * Background authoritative tab id for DNR is `sender.tab.id`, never a value
 * from the page.
 */
export class Tabs extends Context.Tag("Tabs")<
  Tabs,
  {
    readonly currentTabId: () => Effect.Effect<number, TabIdUnavailable>
  }
>() {}
