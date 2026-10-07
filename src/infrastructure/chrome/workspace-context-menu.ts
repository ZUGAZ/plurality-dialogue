import { Effect, Either, Schema } from "effect"
import {
  ApplyContextMenuDraft,
  ClaimPendingContextMenu,
  ContextMenuClaimResponse,
  isPendingContextMenu,
} from "../../domain/messaging/context-menu-draft"
import {
  sendRuntimeMessage,
  subscribeRuntimeMessageEffects,
  type RunPromise,
} from "./runtime-messaging"

export const bindWorkspaceContextMenuDraft = <Requirements>(
  apply: (draftText: string | undefined) => void,
  run: RunPromise<Requirements>,
): void => {
  subscribeRuntimeMessageEffects((message) => {
    Either.match(Schema.decodeUnknownEither(ApplyContextMenuDraft)(message), {
      onLeft: () => undefined,
      onRight: (draft) => {
        apply(draft.draftText)
      },
    })
    return undefined
  }, run)
  void run(claimPendingContextMenu(apply))
}

const claimPendingContextMenu = (
  apply: (draftText: string | undefined) => void,
) =>
  Effect.log("claim pending context menu").pipe(
    Effect.zipRight(readPendingContextMenu(apply)),
    Effect.withLogSpan("claimPendingContextMenu"),
    Effect.withLogSpan("workspace"),
  )

const readPendingContextMenu = (
  apply: (draftText: string | undefined) => void,
) =>
  Either.match(encodedClaim(), {
    onLeft: () => Effect.void,
    onRight: (message) =>
      sendRuntimeMessage(message).pipe(
        Effect.orElseSucceed(() => undefined),
        Effect.tap((raw) =>
          Effect.sync(() => {
            applyClaimedDraft(raw, apply)
          }),
        ),
      ),
  })

const encodedClaim = () =>
  Schema.encodeUnknownEither(ClaimPendingContextMenu)(
    ClaimPendingContextMenu.make({}),
  )

const applyClaimedDraft = (
  raw: unknown,
  apply: (draftText: string | undefined) => void,
): void => {
  Either.match(Schema.decodeUnknownEither(ContextMenuClaimResponse)(raw), {
    onLeft: () => undefined,
    onRight: (response) => {
      if (isPendingContextMenu(response)) {
        apply(response.draftText)
      }
    },
  })
}
