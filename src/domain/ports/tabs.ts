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
 * Live `currentTabId` is the workspace page asking Chrome who this tab is.
 * `getCurrent()` is first; own-document `getContexts` and the active tab
 * are fallbacks. The id is optional on EnsureFramingRules. Background
 * prefers `sender.tab.id`, then the request, then workspace document
 * contexts. Do not add the tabs permission to paper over a missing sender.
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
