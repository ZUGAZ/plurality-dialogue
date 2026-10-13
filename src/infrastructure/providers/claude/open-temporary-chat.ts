import { Effect } from "effect"
import { TemporaryChatUnavailable } from "../../../domain/ports/provider-page"
import { composerWaitMs, waitForElement } from "../wait-for-element"
import { primaryIncognitoSelector } from "./selectors"

export const openClaudeTemporaryChat = (
  root: ParentNode,
): Effect.Effect<void, TemporaryChatUnavailable> =>
  waitForElement(
    () => root.querySelector(primaryIncognitoSelector),
    composerWaitMs,
  ).pipe(
    Effect.catchTag("ComposerNotFound", (error) =>
      Effect.fail(new TemporaryChatUnavailable({ reason: error.reason })),
    ),
    Effect.flatMap(clickIncognitoUnlessPressed),
  )

const clickIncognitoUnlessPressed = (
  element: Element,
): Effect.Effect<void, TemporaryChatUnavailable> => {
  if (!(element instanceof HTMLButtonElement)) {
    return Effect.fail(
      new TemporaryChatUnavailable({
        reason: "temporary chat control is not a button",
      }),
    )
  }
  if (element.getAttribute("aria-pressed") === "true") {
    return Effect.void
  }
  return Effect.sync(() => {
    element.click()
  })
}
