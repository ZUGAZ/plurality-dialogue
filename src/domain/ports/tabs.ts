import type { Effect } from "effect"
import { Context, Data, Schema } from "effect"
import type { TabIdUnavailable } from "../workspace/tab-id-unavailable"

export const OpenTab = Schema.Struct({
  id: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  windowId: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
})

export type OpenTab = typeof OpenTab.Type

export class TabQueryFailed extends Data.TaggedError("TabQueryFailed")<{
  readonly message: string
}> {}

export class TabCreateFailed extends Data.TaggedError("TabCreateFailed")<{
  readonly message: string
}> {}

export class TabFocusFailed extends Data.TaggedError("TabFocusFailed")<{
  readonly message: string
}> {}

/**
 * Live `currentTabId` is `chrome.tabs.getCurrent()` in the workspace page.
 * Background authoritative tab id for DNR is `sender.tab.id`, never a value
 * from the page.
 */
export class Tabs extends Context.Tag("Tabs")<
  Tabs,
  {
    readonly currentTabId: () => Effect.Effect<number, TabIdUnavailable>
    readonly queryByUrl: (
      url: string,
    ) => Effect.Effect<readonly OpenTab[], TabQueryFailed>
    readonly create: (url: string) => Effect.Effect<OpenTab, TabCreateFailed>
    readonly focus: (tab: OpenTab) => Effect.Effect<void, TabFocusFailed>
  }
>() {}
