import { Effect, Option } from "effect"
import { batch, createSignal } from "solid-js"
import type { Messaging } from "@domain/ports/messaging"
import type { Storage } from "@domain/ports/storage"
import type { Tabs } from "@domain/ports/tabs"
import type { Provider } from "@domain/provider/provider"
import { providerIds, type ProviderId } from "@domain/provider/provider-id"
import {
  getBuiltInProvider,
  listEnabledProviders,
} from "@domain/provider/registry"
import { requestFramingRules } from "@domain/workspace/request-framing-rules"
import type { RunEffect } from "@ui/common/viewmodel/bind-viewmodel"
import {
  WORKSPACE_DEFAULT_SLOT_COUNT,
  bumpPanelGeneration,
  createDefaultSlots,
  decodeProviderId,
  reconcileSlotsWithEnabled,
  replacePanelProvider,
  selectOptions,
  toPanelViewState,
  type PanelSlot,
  type PanelViewState,
  type ProviderOption,
} from "./model"

export type PanelGridViewModel = {
  readonly panels: () => readonly PanelViewState[]
  readonly options: () => readonly ProviderOption[]
  readonly onPanelLoad: (id: string) => void
  readonly setPanelProvider: (
    panelId: string,
    rawId: string,
  ) => Effect.Effect<void>
  readonly refreshPanel: (panelId: string) => Effect.Effect<void>
}

export const createPanelGridViewModel = (
  runEffect: RunEffect<Storage | Tabs | Messaging>,
): PanelGridViewModel => {
  const [providers, setProviders] =
    createSignal<readonly Provider[]>(emptyProviders)
  const [enabledListReady, setEnabledListReady] = createSignal(false)
  const [framingReady, setFramingReady] = createSignal(false)
  const [framingFailed, setFramingFailed] = createSignal(false)
  const [loadedPanelIds, setLoadedPanelIds] =
    createSignal<ReadonlySet<string>>(emptyLoadedIds)
  const [slots, setSlots] = createSignal<readonly PanelSlot[]>(
    createDefaultSlots(providerIds, WORKSPACE_DEFAULT_SLOT_COUNT),
  )

  const dropLoadedPanelIds = (panelIds: readonly string[]): void => {
    if (panelIds.length === 0) {
      return
    }
    setLoadedPanelIds((current) => {
      const next = new Set(current)
      let changed = false
      for (const id of panelIds) {
        if (next.delete(id)) {
          changed = true
        }
      }
      return changed ? next : current
    })
  }

  const commitSlots = (next: readonly PanelSlot[]): void => {
    const previous = slots()
    if (next === previous) {
      return
    }
    batch(() => {
      setSlots(next)
      dropLoadedPanelIds(bumpedPanelIds(previous, next))
    })
  }

  const applyEnabledProviders = (list: readonly Provider[]): void => {
    const ids = list.map((provider) => provider.id)
    setProviders(list)
    setEnabledListReady(true)
    commitSlots(reconcileSlotsWithEnabled(slots(), ids))
  }

  runEffect(
    listEnabledProviders().pipe(
      Effect.match({
        onFailure: () => {
          applyEnabledProviders(emptyProviders)
        },
        onSuccess: applyEnabledProviders,
      }),
    ),
  )
  runEffect(
    requestFramingRules().pipe(
      Effect.match({
        onFailure: () => {
          setFramingFailed(true)
        },
        onSuccess: () => {
          setFramingReady(true)
        },
      }),
    ),
  )

  const enabledIds = (): readonly ProviderId[] =>
    providers().map((provider) => provider.id)

  const panels = (): readonly PanelViewState[] => {
    const listReady = enabledListReady()
    const ready = framingReady() && listReady
    const failed = framingFailed()
    const loaded = loadedPanelIds()
    return slots().map((slot) => {
      const visible = listReady ? slot : hiddenSlot(slot)
      return toPanelViewState(visible, embedUrlFor(visible.providerId), {
        framingReady: ready,
        failed,
        hasLoaded: loaded.has(slot.id),
      })
    })
  }

  const options = (): readonly ProviderOption[] => selectOptions(enabledIds())

  const onPanelLoad = (id: string): void => {
    setLoadedPanelIds((current) => {
      if (current.has(id)) {
        return current
      }
      const next = new Set(current)
      next.add(id)
      return next
    })
  }

  const setPanelProvider = (
    panelId: string,
    rawId: string,
  ): Effect.Effect<void> => {
    const decoded = decodeProviderId(rawId, enabledIds())
    if (decoded === null) {
      return Effect.void
    }
    return Effect.sync(() => {
      commitSlots(replacePanelProvider(slots(), panelId, decoded))
    })
  }

  const refreshPanel = (panelId: string): Effect.Effect<void> =>
    Effect.sync(() => {
      const current = slots()
      const slot = current.find((item) => item.id === panelId)
      if (slot === undefined || slot.providerId === null) {
        return
      }
      commitSlots(bumpPanelGeneration(current, panelId))
    })

  return { panels, options, onPanelLoad, setPanelProvider, refreshPanel }
}

const emptyProviders: readonly Provider[] = []

const emptyLoadedIds: ReadonlySet<string> = new Set()

const hiddenSlot = (slot: PanelSlot): PanelSlot => ({
  id: slot.id,
  providerId: null,
  reloadGeneration: slot.reloadGeneration,
})

const embedUrlFor = (providerId: ProviderId | null): string | undefined => {
  if (providerId === null) {
    return undefined
  }
  return Option.getOrUndefined(
    Option.map(getBuiltInProvider(providerId), (definition) => definition.url),
  )
}

const bumpedPanelIds = (
  previous: readonly PanelSlot[],
  next: readonly PanelSlot[],
): readonly string[] =>
  next
    .filter(
      (slot, index) =>
        slot.reloadGeneration !== previous[index]?.reloadGeneration,
    )
    .map((slot) => slot.id)
