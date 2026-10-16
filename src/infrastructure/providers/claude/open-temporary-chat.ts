import { Effect } from "effect"
import { TemporaryChatUnavailable } from "../../../domain/ports/provider-page"
import { composerWaitMs } from "../wait-for-element"
import { requestClaudeIncognitoChord } from "./incognito-chord"
import { primaryIncognitoSelector } from "./selectors"

const incognitoChatLabel = "Incognito chat"

const pollInterval = "50 millis"

export const openClaudeTemporaryChat = (
  root: ParentNode,
  pressIncognito: () => void = requestClaudeIncognitoChord,
): Effect.Effect<void, TemporaryChatUnavailable> => {
  const control = root.querySelector(primaryIncognitoSelector)
  if (control !== null) {
    return clickIncognitoUnlessPressed(control)
  }
  // The iframe shell often never mounts the ghost button. Claude still
  // starts incognito from Ctrl+Shift+I (Cmd+Shift+I on Mac).
  return Effect.log("claude incognito chord").pipe(
    Effect.zipRight(waitForIncognito(root, pressIncognito)),
  )
}

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

const waitForIncognito = (
  root: ParentNode,
  pressIncognito: () => void,
): Effect.Effect<void, TemporaryChatUnavailable> => {
  const attempt = { sent: false }
  const poll: Effect.Effect<void, TemporaryChatUnavailable> = Effect.suspend(
    () => {
      const control = root.querySelector(primaryIncognitoSelector)
      if (control !== null) {
        return clickIncognitoUnlessPressed(control)
      }
      if (incognitoLabel(root) !== null) {
        return Effect.void
      }
      if (!attempt.sent) {
        return Effect.sync(() => {
          attempt.sent = true
          pressIncognito()
        }).pipe(Effect.zipRight(poll))
      }
      return Effect.sleep(pollInterval).pipe(Effect.zipRight(poll))
    },
  )
  return poll.pipe(
    Effect.timeoutFail({
      duration: `${composerWaitMs} millis`,
      onTimeout: () =>
        new TemporaryChatUnavailable({
          reason: "incognito chord did not start a private chat",
        }),
    }),
  )
}

const incognitoLabel = (root: ParentNode): Element | null => {
  const labeled = root.querySelector(`[aria-label="${incognitoChatLabel}"]`)
  if (labeled !== null) {
    return labeled
  }
  for (const node of root.querySelectorAll("p, span, h1, h2")) {
    if (
      node.childElementCount === 0 &&
      node.textContent?.trim() === incognitoChatLabel
    ) {
      return node
    }
  }
  return null
}
