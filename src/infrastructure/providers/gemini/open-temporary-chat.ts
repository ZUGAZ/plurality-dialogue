import { Effect } from "effect"
import { TemporaryChatUnavailable } from "../../../domain/ports/provider-page"
import { composerWaitMs, waitForElement } from "../wait-for-element"
import { primaryTemporaryChatSelector } from "./selectors"

export const openGeminiTemporaryChat = (): Effect.Effect<
  void,
  TemporaryChatUnavailable
> =>
  waitForElement(
    () => document.querySelector(primaryTemporaryChatSelector),
    composerWaitMs,
  ).pipe(
    Effect.catchTag("ComposerNotFound", (error) =>
      Effect.fail(new TemporaryChatUnavailable({ reason: error.reason })),
    ),
    Effect.flatMap(clickTemporaryChat),
  )

const clickTemporaryChat = (
  element: Element,
): Effect.Effect<void, TemporaryChatUnavailable> => {
  if (!(element instanceof HTMLButtonElement)) {
    return Effect.fail(
      new TemporaryChatUnavailable({
        reason: "temporary chat control is not a button",
      }),
    )
  }
  return Effect.sync(() => {
    element.click()
  })
}
