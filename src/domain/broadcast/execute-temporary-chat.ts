import { Effect } from "effect"
import { isPanelCommandErr, PanelCommandErr } from "../messaging/panel-command-err"
import { PanelCommandOk } from "../messaging/panel-command-ok"
import { ProviderPage } from "../ports/provider-page"
import type { PanelIdentity } from "./execute-panel-command"

export const executeTemporaryChat = Effect.fn("executeTemporaryChat")(function* (
  identity: PanelIdentity,
) {
  const page = yield* ProviderPage
  return yield* page.openTemporaryChat().pipe(
    Effect.map(() =>
      PanelCommandOk.make({
        verb: "temporary-chat",
        providerId: identity.providerId,
        panelId: identity.panelId,
      }),
    ),
    Effect.catchTag("TemporaryChatUnavailable", () =>
      Effect.succeed(
        PanelCommandErr.make({
          providerId: identity.providerId,
          panelId: identity.panelId,
          reason: "temporary-chat-unavailable",
        }),
      ),
    ),
    Effect.tap((response) =>
      isPanelCommandErr(response)
        ? Effect.logWarning(
            "panel command failed",
            response.reason,
            identity.providerId,
            identity.panelId,
          )
        : Effect.void,
    ),
  )
})
