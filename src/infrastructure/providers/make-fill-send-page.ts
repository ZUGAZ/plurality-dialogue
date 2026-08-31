import { Effect } from "effect"
import {
  SubmitControlDisabled,
  SubmitControlNotFound,
} from "../../domain/ports/provider-page"
import { insertComposerText } from "./insert-composer-text"
import {
  composerWaitMs,
  submitEnableWaitMs,
  waitForElement,
} from "./wait-for-element"

export type FillSendQueries = {
  readonly queryComposer: () => HTMLElement | null
  readonly querySend: () => HTMLElement | null
}

export const makeFillSendPage = (queries: FillSendQueries) => ({
  fillComposer: (text: string) =>
    fillComposerWith(queries.queryComposer, text),
  submit: () => submitWith(queries.querySend),
})

const fillComposerWith = (
  queryComposer: () => HTMLElement | null,
  text: string,
) =>
  waitForElement(queryComposer, composerWaitMs).pipe(
    Effect.flatMap((element) => insertComposerText(element, text)),
  )

const submitWith = (querySend: () => HTMLElement | null) =>
  waitForElement(
    () => enabledSend(querySend()),
    submitEnableWaitMs,
  ).pipe(
    Effect.catchAll(() => missingOrDisabledSend(querySend())),
    Effect.flatMap((element) => {
      if (!(element instanceof HTMLElement)) {
        return Effect.fail(
          new SubmitControlNotFound({ reason: "send control not found" }),
        )
      }
      return Effect.sync(() => {
        element.click()
      })
    }),
  )

const enabledSend = (send: HTMLElement | null): HTMLElement | null => {
  if (send === null || isDisabledControl(send)) {
    return null
  }
  return send
}

const missingOrDisabledSend = (
  send: HTMLElement | null,
): Effect.Effect<never, SubmitControlDisabled | SubmitControlNotFound> => {
  if (send !== null && isDisabledControl(send)) {
    return Effect.fail(
      new SubmitControlDisabled({ reason: "send control is disabled" }),
    )
  }
  return Effect.fail(
    new SubmitControlNotFound({ reason: "send control not found" }),
  )
}

const isDisabledControl = (element: HTMLElement): boolean => {
  if (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) {
    return element.disabled
  }
  return (
    element.hasAttribute("disabled") ||
    element.getAttribute("aria-disabled") === "true"
  )
}
