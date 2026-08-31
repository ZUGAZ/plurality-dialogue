import { Effect, Either, Layer, pipe } from "effect"
import { parseWorkspaceTabId } from "../workspace/framing-session-rules"
import { Tabs } from "./tabs"

export const inMemoryTabsLayer = (currentId: number) =>
  Layer.succeed(Tabs, {
    currentTabId: () =>
      pipe(
        parseWorkspaceTabId(currentId),
        Either.match({
          onLeft: (error) => Effect.fail(error),
          onRight: (id) => Effect.succeed(id),
        }),
      ),
  })
