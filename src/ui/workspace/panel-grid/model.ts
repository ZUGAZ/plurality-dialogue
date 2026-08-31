import {
  cellCount,
  defaultLayoutId,
  presetById,
  type LayoutId,
} from "@domain/layout/presets"
import {
  isProviderId,
  providerIds,
  type ProviderId,
} from "@domain/provider/provider-id"

export type { LayoutId }

export type PanelId = string

export type PanelSlot = {
  readonly id: PanelId
  readonly providerId: ProviderId | null
  readonly reloadGeneration: number
}

export type ProviderOption = {
  readonly id: ProviderId
  readonly label: string
}

export type PanelViewState = {
  readonly id: string
  readonly title: string
  readonly iconSrc?: string
  readonly embedUrl: string
  readonly src: string | undefined
  readonly hasLoaded: boolean
  readonly failed: boolean
  readonly providerId: ProviderId | null
  readonly reloadGeneration: number
}

export const WORKSPACE_DEFAULT_SLOT_COUNT = cellCount(
  presetById(defaultLayoutId),
)

export const panelIdAt = (index: number): PanelId => `panel-${index + 1}`

export const iframeSrc = (
  framingReady: boolean,
  embedUrl: string,
): string | undefined => (framingReady ? embedUrl : undefined)

export const isPanelLoading = (
  src: string | undefined,
  hasLoaded: boolean,
): boolean => src !== undefined && !hasLoaded

export const isHttpsIframeSrc = (
  src: string | undefined,
): src is string =>
  src !== undefined && src.startsWith("https://") && src !== "https://"

export type PanelFrameInputs = {
  readonly framingReady: boolean
  readonly failed: boolean
  readonly hasLoaded: boolean
}

export const labelForProvider = (id: ProviderId): string => {
  switch (id) {
    case "chatgpt":
      return "ChatGPT"
    case "claude":
      return "Claude"
    case "gemini":
      return "Gemini"
  }
}

export const createDefaultSlots = (
  enabledIds: readonly ProviderId[],
  slotCount: number,
): readonly PanelSlot[] =>
  Array.from({ length: slotCount }, (_, index) => ({
    id: panelIdAt(index),
    providerId: providerAt(enabledIds, index),
    reloadGeneration: 0,
  }))

export const resizeSlots = (
  slots: readonly PanelSlot[],
  enabledIds: readonly ProviderId[],
  slotCount: number,
): readonly PanelSlot[] => {
  if (slotCount === slots.length) {
    return slots
  }
  if (slotCount < slots.length) {
    return slots.slice(0, slotCount)
  }
  return [
    ...slots,
    ...createDefaultSlots(enabledIds, slotCount).slice(slots.length),
  ]
}

export const layoutTrackCounts = (
  layoutId: LayoutId,
): { readonly columns: number; readonly rows: number } => {
  const grid = presetById(layoutId)
  return { columns: grid.columnCount, rows: grid.rowCount }
}

export const decodeProviderId = (
  raw: string,
  enabledIds: readonly ProviderId[],
): ProviderId | null => {
  if (!isProviderId(raw)) {
    return null
  }
  return enabledIds.includes(raw) ? raw : null
}

export const replacePanelProvider = (
  slots: readonly PanelSlot[],
  panelId: PanelId,
  nextId: ProviderId,
): readonly PanelSlot[] => {
  const index = slots.findIndex((slot) => slot.id === panelId)
  const current = index === -1 ? undefined : slots[index]
  if (current === undefined || current.providerId === nextId) {
    return slots
  }
  return slots.map((slot, slotIndex) =>
    slotIndex === index
      ? {
          ...slot,
          providerId: nextId,
          reloadGeneration: slot.reloadGeneration + 1,
        }
      : slot,
  )
}

export const bumpPanelGeneration = (
  slots: readonly PanelSlot[],
  panelId: PanelId,
): readonly PanelSlot[] => {
  const index = slots.findIndex((slot) => slot.id === panelId)
  if (index === -1) {
    return slots
  }
  return slots.map((slot, slotIndex) =>
    slotIndex === index
      ? { ...slot, reloadGeneration: slot.reloadGeneration + 1 }
      : slot,
  )
}

export const reconcileSlotsWithEnabled = (
  slots: readonly PanelSlot[],
  enabledIds: readonly ProviderId[],
): readonly PanelSlot[] => {
  if (enabledIds.length === 0) {
    return clearProvidersWhenEmpty(slots)
  }
  return reassignMissingProviders(slots, enabledIds)
}

export const selectOptions = (
  enabledIds: readonly ProviderId[],
): readonly ProviderOption[] => {
  const enabled = new Set(enabledIds)
  return providerIds
    .filter((id) => enabled.has(id))
    .map((id) => ({ id, label: labelForProvider(id) }))
}

export const isRefreshEnabled = (slot: PanelSlot): boolean =>
  slot.providerId !== null

export const toPanelViewState = (
  slot: PanelSlot,
  embedUrl: string | undefined,
  inputs: PanelFrameInputs,
): PanelViewState => {
  const providerId = slot.providerId
  return {
    id: slot.id,
    title: providerId === null ? "Panel" : labelForProvider(providerId),
    embedUrl: embedUrl ?? "",
    src:
      providerId === null || embedUrl === undefined
        ? undefined
        : iframeSrc(inputs.framingReady, embedUrl),
    hasLoaded: inputs.hasLoaded,
    failed: inputs.failed,
    providerId,
    reloadGeneration: slot.reloadGeneration,
  }
}

const providerAt = (
  enabledIds: readonly ProviderId[],
  index: number,
): ProviderId | null => {
  if (enabledIds.length === 0) {
    return null
  }
  const id = enabledIds[index % enabledIds.length]
  return id === undefined ? null : id
}

const clearProvidersWhenEmpty = (
  slots: readonly PanelSlot[],
): readonly PanelSlot[] => {
  const next = slots.map((slot) =>
    slot.providerId === null
      ? slot
      : {
          ...slot,
          providerId: null,
          reloadGeneration: slot.reloadGeneration + 1,
        },
  )
  return sameSlots(slots, next) ? slots : next
}

const reassignMissingProviders = (
  slots: readonly PanelSlot[],
  enabledIds: readonly ProviderId[],
): readonly PanelSlot[] => {
  const next = slots.map((slot, index) => {
    if (slot.providerId !== null && enabledIds.includes(slot.providerId)) {
      return slot
    }
    const nextId = providerAt(enabledIds, index)
    if (nextId === null || nextId === slot.providerId) {
      return slot
    }
    return {
      ...slot,
      providerId: nextId,
      reloadGeneration: slot.reloadGeneration + 1,
    }
  })
  return sameSlots(slots, next) ? slots : next
}

const sameSlots = (
  current: readonly PanelSlot[],
  next: readonly PanelSlot[],
): boolean => next.every((slot, index) => slot === current[index])
