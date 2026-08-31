import { Array, Effect, Option, pipe } from "effect"
import { Tabs } from "../ports/tabs"

export const openWorkspace = Effect.fn("openWorkspace")(function* (
  workspacePageUrl: string,
) {
  const tabs = yield* Tabs
  const matches = yield* tabs.queryByUrl(workspacePageUrl)
  return yield* pipe(
    Array.head(matches),
    Option.match({
      onNone: () => tabs.create(workspacePageUrl),
      onSome: (tab) => tabs.focus(tab).pipe(Effect.as(tab)),
    }),
  )
})
