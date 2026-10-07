export type PendingContextMenuSlot = {
  readonly draftText?: string
}

let pending: PendingContextMenuSlot | undefined

export const replacePendingContextMenu = (
  slot: PendingContextMenuSlot,
): void => {
  pending = slot
}

export const takePendingContextMenu = ():
  | PendingContextMenuSlot
  | undefined => {
  const current = pending
  pending = undefined
  return current
}

export const clearPendingContextMenuIfMatch = (
  slot: PendingContextMenuSlot,
): void => {
  if (pending === undefined) {
    return
  }
  if (pending.draftText !== slot.draftText) {
    return
  }
  pending = undefined
}
