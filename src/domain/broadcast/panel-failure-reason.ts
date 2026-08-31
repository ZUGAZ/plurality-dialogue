import { isPanelCommandErr, type PanelCommandErr } from "../messaging/panel-command-err"
import type { MessagingFault } from "../ports/messaging"
import {
  ComposerNotFound,
  ComposerNotWritable,
  SubmitControlDisabled,
  SubmitControlNotFound,
} from "../ports/provider-page"
import type { TabMessageFailed } from "./errors"
import type { PanelFailedReason } from "./panel-failed"

export const panelFailureReason = (
  error:
    | MessagingFault
    | TabMessageFailed
    | PanelCommandErr
    | ComposerNotFound
    | ComposerNotWritable
    | SubmitControlNotFound
    | SubmitControlDisabled,
): PanelFailedReason => {
  if (isPanelCommandErr(error)) {
    return error.reason
  }
  if (error instanceof ComposerNotFound) {
    return "composer-not-found"
  }
  if (error instanceof ComposerNotWritable) {
    return "composer-not-writable"
  }
  if (error instanceof SubmitControlNotFound) {
    return "submit-not-found"
  }
  if (error instanceof SubmitControlDisabled) {
    return "submit-disabled"
  }
  return "messaging-failed"
}
