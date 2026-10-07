import { Schema } from "effect"

export const ApplyContextMenuDraft = Schema.TaggedStruct(
  "ApplyContextMenuDraft",
  {
    draftText: Schema.optional(Schema.String),
  },
)

export type ApplyContextMenuDraft = typeof ApplyContextMenuDraft.Type

export const isApplyContextMenuDraft = Schema.is(ApplyContextMenuDraft)

export const ClaimPendingContextMenu = Schema.TaggedStruct(
  "ClaimPendingContextMenu",
  {},
)

export type ClaimPendingContextMenu = typeof ClaimPendingContextMenu.Type

export const isClaimPendingContextMenu = Schema.is(ClaimPendingContextMenu)

export const PendingContextMenu = Schema.TaggedStruct("PendingContextMenu", {
  draftText: Schema.optional(Schema.String),
})

export type PendingContextMenu = typeof PendingContextMenu.Type

export const isPendingContextMenu = Schema.is(PendingContextMenu)

export const NoPendingContextMenu = Schema.TaggedStruct(
  "NoPendingContextMenu",
  {},
)

export type NoPendingContextMenu = typeof NoPendingContextMenu.Type

export const isNoPendingContextMenu = Schema.is(NoPendingContextMenu)

export const ContextMenuClaimResponse = Schema.Union(
  PendingContextMenu,
  NoPendingContextMenu,
)

export type ContextMenuClaimResponse = typeof ContextMenuClaimResponse.Type

export const isContextMenuClaimResponse = Schema.is(ContextMenuClaimResponse)
