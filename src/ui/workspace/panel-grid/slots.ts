import {
  cellCount,
  layoutIdForCellCount,
  presetById,
  type LayoutId,
} from "@domain/layout/presets"
import { providerIds, type ProviderId } from "@domain/provider/provider-id"
import {
  WORKSPACE_MAX_PANEL_COUNT,
  WORKSPACE_MIN_PANEL_COUNT,
  type PanelId,
  type PanelSlot,
} from "./model"

export const panelIdAt = (index: number): PanelId => `panel-${index + 1}`

export const canAddPanel = (slots: readonly PanelSlot[]): boolean =>
  slots.length < WORKSPACE_MAX_PANEL_COUNT

export const canRemovePanel = (slots: readonly PanelSlot[]): boolean =>
  slots.length > WORKSPACE_MIN_PANEL_COUNT

export const createDefaultSlots = (
  enabledIds: readonly ProviderId[],
  slotCount: number,
): readonly PanelSlot[] =>
  growSlots([], enabledIds, slotCount)

export const slotsFromPanelProviders = (
  providers: readonly (ProviderId | null)[],
): readonly PanelSlot[] =>
  providers.map((providerId, index) => ({
    id: panelIdAt(index),
    providerId,
    reloadGeneration: 0,
  }))

export type InitialPanelGrid = {
  readonly layoutId: LayoutId
  readonly slots: readonly PanelSlot[]
}

export const initialPanelGrid = (
  layoutId: LayoutId,
  panelProviders: readonly (ProviderId | null)[] | undefined,
): InitialPanelGrid => {
  if (panelProviders === undefined) {
    return {
      layoutId,
      slots: createDefaultSlots(providerIds, cellCount(presetById(layoutId))),
    }
  }
  return {
    layoutId:
      cellCount(presetById(layoutId)) === panelProviders.length
        ? layoutId
        : layoutIdForCellCount(panelProviders.length),
    slots: slotsFromPanelProviders(panelProviders),
  }
}

export const panelProvidersFromSlots = (
  slots: readonly PanelSlot[],
): readonly (ProviderId | null)[] => slots.map((slot) => slot.providerId)

export const appendPanelSlot = (
  slots: readonly PanelSlot[],
  enabledIds: readonly ProviderId[],
): readonly PanelSlot[] =>
  canAddPanel(slots) ? [...slots, newSlot(slots, enabledIds)] : slots

export const removePanelSlot = (
  slots: readonly PanelSlot[],
  panelId: PanelId,
): readonly PanelSlot[] =>
  canRemovePanel(slots) && slots.some((slot) => slot.id === panelId)
    ? slots.filter((slot) => slot.id !== panelId)
    : slots

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
  return growSlots(slots, enabledIds, slotCount)
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

export const bumpAllLoadedPanels = (
  slots: readonly PanelSlot[],
  loadedIds: ReadonlySet<string>,
): readonly PanelSlot[] => {
  const next = slots.map((slot) =>
    loadedIds.has(slot.id) && slot.providerId !== null
      ? { ...slot, reloadGeneration: slot.reloadGeneration + 1 }
      : slot,
  )
  return sameSlots(slots, next) ? slots : next
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

export const hiddenSlot = (slot: PanelSlot): PanelSlot => ({
  id: slot.id,
  providerId: null,
  reloadGeneration: slot.reloadGeneration,
})

/** Panels whose iframe was replaced or unmounted between two slot lists. */
export const staleLoadedPanelIds = (
  previous: readonly PanelSlot[],
  next: readonly PanelSlot[],
): readonly PanelId[] => {
  const nextById = new Map(next.map((slot) => [slot.id, slot]))
  return previous
    .filter((slot) => {
      const survivor = nextById.get(slot.id)
      return (
        survivor === undefined ||
        survivor.reloadGeneration !== slot.reloadGeneration
      )
    })
    .map((slot) => slot.id)
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

const panelNumber = (id: PanelId): number => {
  const digits = /^panel-(\d+)$/.exec(id)?.[1]
  return digits === undefined ? 0 : Number(digits)
}

const nextPanelId = (slots: readonly PanelSlot[]): PanelId =>
  `panel-${Math.max(0, ...slots.map((slot) => panelNumber(slot.id))) + 1}`

const newSlot = (
  slots: readonly PanelSlot[],
  enabledIds: readonly ProviderId[],
): PanelSlot => ({
  id: nextPanelId(slots),
  providerId: providerAt(enabledIds, slots.length),
  reloadGeneration: 0,
})

const growSlots = (
  slots: readonly PanelSlot[],
  enabledIds: readonly ProviderId[],
  slotCount: number,
): readonly PanelSlot[] =>
  Array.from({ length: Math.max(0, slotCount - slots.length) }).reduce<
    readonly PanelSlot[]
  >((grown) => [...grown, newSlot(grown, enabledIds)], slots)

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
