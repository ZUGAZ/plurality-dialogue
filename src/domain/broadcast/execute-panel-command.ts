import { Effect } from "effect"
import type { FillAndSubmit } from "./commands/fill-and-submit"
import { isFillComposer } from "./commands/fill-composer"
import type { FillComposer } from "./commands/fill-composer"
import {
  PanelCommandErr,
  type PanelCommandErrReason,
} from "../messaging/panel-command-err"
import { PanelCommandOk } from "../messaging/panel-command-ok"
import { ProviderPage } from "../ports/provider-page"
import type { ProviderId } from "../provider/provider-id"

export type PanelIdentity = {
  readonly providerId: ProviderId
  readonly panelId: string
}

export const executePanelCommand = Effect.fn("executePanelCommand")(function* (
  command: FillComposer | FillAndSubmit,
  identity: PanelIdentity,
) {
  const page = yield* ProviderPage
  const filledOrSubmitted = isFillComposer(command)
    ? page.fillComposer(command.prompt).pipe(
        Effect.map(() => ok(identity, "filled")),
      )
    : page.fillComposer(command.prompt).pipe(
        Effect.flatMap(() => page.submit()),
        Effect.map(() => ok(identity, "submitted")),
      )
  return yield* filledOrSubmitted.pipe(
    Effect.catchTag("ComposerNotFound", () =>
      commandErr(identity, "composer-not-found"),
    ),
    Effect.catchTag("ComposerNotWritable", () =>
      commandErr(identity, "composer-not-writable"),
    ),
    Effect.catchTag("SubmitControlNotFound", () =>
      commandErr(identity, "submit-not-found"),
    ),
    Effect.catchTag("SubmitControlDisabled", () =>
      commandErr(identity, "submit-disabled"),
    ),
  )
})

const ok = (identity: PanelIdentity, verb: "filled" | "submitted") =>
  PanelCommandOk.make({
    verb,
    providerId: identity.providerId,
    panelId: identity.panelId,
  })

const commandErr = (
  identity: PanelIdentity,
  reason: PanelCommandErrReason,
) =>
  Effect.succeed(
    PanelCommandErr.make({
      providerId: identity.providerId,
      panelId: identity.panelId,
      reason,
    }),
  )
