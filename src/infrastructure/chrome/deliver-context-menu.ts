import { Effect, Either, Option, Schema } from "effect"
import { ApplyContextMenuDraft } from "../../domain/messaging/context-menu-draft"
import {
  draftTextFromContextMenu,
  type ContextMenuDraftSource,
} from "../../domain/workspace/context-menu-draft"
import { openWorkspace } from "../../domain/workspace/open-workspace"
import {
  clearPendingContextMenuIfMatch,
  replacePendingContextMenu,
  type PendingContextMenuSlot,
} from "./pending-context-menu"
import { sendMessageToTab } from "./tabs"

const slotFromDraft = (
  draftText: Option.Option<string>,
): PendingContextMenuSlot =>
  Option.match(draftText, {
    onNone: () => ({}),
    onSome: (text) => ({ draftText: text }),
  })

const encodedApplyMessage = (slot: PendingContextMenuSlot) =>
  Schema.encodeUnknownEither(ApplyContextMenuDraft)(
    slot.draftText === undefined
      ? ApplyContextMenuDraft.make({})
      : ApplyContextMenuDraft.make({ draftText: slot.draftText }),
  )

const sendApply = (tabId: number, slot: PendingContextMenuSlot) =>
  Either.match(encodedApplyMessage(slot), {
    onLeft: () => Effect.void,
    onRight: (message) =>
      sendMessageToTab(tabId, message).pipe(
        Effect.matchEffect({
          onFailure: () => Effect.void,
          onSuccess: () =>
            Effect.sync(() => {
              clearPendingContextMenuIfMatch(slot)
            }),
        }),
      ),
  })

export const deliverContextMenuClick = Effect.fn("deliverContextMenuClick")(
  function* (workspaceUrl: string, source: ContextMenuDraftSource) {
    const slot = slotFromDraft(draftTextFromContextMenu(source))
    // A newer click replaces the slot while this send is still in flight.
    replacePendingContextMenu(slot)
    const tab = yield* openWorkspace(workspaceUrl)
    yield* sendApply(tab.id, slot)
  },
)
