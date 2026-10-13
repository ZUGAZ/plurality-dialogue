import { createSignal } from "solid-js"
import type { PanelSlot } from "./model"
import { bumpAllLoadedPanels, staleLoadedPanelIds } from "./slots"

export const createTemporaryChatSession = (host: {
  readonly slots: () => readonly PanelSlot[]
  readonly loadedPanelIds: () => ReadonlySet<string>
  readonly commitSlots: (next: readonly PanelSlot[]) => void
  readonly clearLoadedPanelIds: () => void
}): {
  readonly temporaryChat: () => boolean
  readonly applyTemporaryChat: (enabled: boolean) => readonly string[]
} => {
  const [temporaryChat, setTemporaryChat] = createSignal(false)

  const applyTemporaryChat = (enabled: boolean): readonly string[] => {
    setTemporaryChat(enabled)
    if (enabled) {
      return []
    }
    const current = host.slots()
    const bumped = bumpAllLoadedPanels(current, host.loadedPanelIds())
    if (bumped === current) {
      return []
    }
    const ids = staleLoadedPanelIds(current, bumped)
    host.commitSlots(bumped)
    host.clearLoadedPanelIds()
    return ids
  }

  return { temporaryChat, applyTemporaryChat }
}
