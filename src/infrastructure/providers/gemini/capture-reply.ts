import { Effect } from "effect"
import { firstDisplayed, lastDisplayed } from "../displayed-element"
import { readVisibleText } from "../extract-message-text"
import {
  replyCaptureTimeoutMs,
  replyStableMs,
  waitForStableReply,
} from "../wait-for-stable-reply"
import {
  assistantReplySelectors,
  streamingIndicatorSelectors,
} from "./selectors"

export const queryLastAssistantReply = (root: ParentNode): string | null => {
  const message = lastDisplayed(root, assistantReplySelectors)
  if (message === null) {
    return null
  }
  return readVisibleText(message)
}

export const queryAssistantStreaming = (root: ParentNode): boolean =>
  firstDisplayed(root, streamingIndicatorSelectors) !== null

export const makeGeminiCaptureReply = (root: ParentNode) => () =>
  waitForStableReply(
    {
      queryReplyText: () => queryLastAssistantReply(root),
      queryIsStreaming: () => queryAssistantStreaming(root),
    },
    replyCaptureTimeoutMs,
    replyStableMs,
  ).pipe(Effect.map((text) => ({ text })))
