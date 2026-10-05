import { Effect, Option } from "effect"
import { batch, createSignal } from "solid-js"
import {
  cellCount,
  defaultLayoutId,
  layoutIdForCellCount,
  presetById,
  type LayoutId,
} from "@domain/layout/presets"
import type { Messaging } from "@domain/ports/messaging"
import type { Storage } from "@domain/ports/storage"
import type { Tabs } from "@domain/ports/tabs"
import type { Provider } from "@domain/provider/provider"
import type { ProviderId } from "@domain/provider/provider-id"
import {
  getBuiltInProvider,
  listEnabledProviders,
} from "@domain/provider/registry"
import { requestFramingRules } from "@domain/workspace/request-framing-rules"
import type { RunEffect } from "@ui/common/viewmodel/bind-viewmodel"
import { persistLayoutAndPanelProviders } from "@ui/workspace/layout-presets/view-model"
import {
  decodeProviderId,
  layoutTrackCounts,
  selectOptions,
  handshakeErrorText,
  toPanelViewState,
  type PanelSlot,
  type PanelViewState,
  type ProviderOption,
} from "./model"
import {
  appendPanelSlot,
  bumpPanelGeneration,
  canAddPanel,
  canRemovePanel,
  hiddenSlot,
  initialPanelGrid,
  panelProvidersFromSlots,
  reconcileSlotsWithEnabled,
  removePanelSlot,
  replacePanelProvider,
  resizeSlots,
  staleLoadedPanelIds,
} from "./slots"

export type PanelGridViewModel = {
  readonly layoutId: () => LayoutId
  readonly layoutColumns: () => number
  readonly layoutRows: () => number
  readonly panels: () => readonly PanelViewState[]
  readonly options: () => readonly ProviderOption[]
  readonly onPanelLoad: (id: string) => void
  readonly selectLayout: (
    id: LayoutId,
  ) => Effect.Effect<void, never, Storage>
  readonly addPanel: () => Effect.Effect<void, never, Storage>
  readonly removePanel: (
    panelId: string,
  ) => Effect.Effect<void, never, Storage>
  readonly canAddPanel: () => boolean
  readonly canRemovePanel: () => boolean
  readonly setPanelProvider: (
    panelId: string,
    rawId: string,
  ) => Effect.Effect<void, never, Storage>
  readonly refreshPanel: (panelId: string) => Effect.Effect<void>
}

export type PanelGridInitial = {
  readonly layoutId: LayoutId
  readonly panelProviders?: readonly (ProviderId | null)[]
}

export const createPanelGridViewModel = (
  runEffect: RunEffect<Storage | Tabs | Messaging>,
  initial: PanelGridInitial = { layoutId: defaultLayoutId },
): PanelGridViewModel => {
  const start = initialPanelGrid(initial.layoutId, initial.panelProviders)
  const [providers, setProviders] =
    createSignal<readonly Provider[]>(emptyProviders)
  const [enabledListReady, setEnabledListReady] = createSignal(false)
  const [framingReady, setFramingReady] = createSignal(false)
  const [framingFailed, setFramingFailed] = createSignal(false)
  const [framingError, setFramingError] = createSignal<string | undefined>(
    undefined,
  )
  const [loadedPanelIds, setLoadedPanelIds] =
    createSignal<ReadonlySet<string>>(emptyLoadedIds)
  const [layoutId, setLayoutId] = createSignal<LayoutId>(start.layoutId)
  const [slots, setSlots] = createSignal<readonly PanelSlot[]>(start.slots)

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
      dropLoadedPanelIds(staleLoadedPanelIds(previous, next))
    })
  }

  const applyEnabledProviders = (list: readonly Provider[]): void => {
    const ids = list.map((provider) => provider.id)
    setProviders(list)
    setEnabledListReady(true)
    commitSlots(reconcileSlotsWithEnabled(slots(), ids))
  }

  runEffect(
    Effect.log("load enabled providers").pipe(
      Effect.zipRight(listEnabledProviders()),
      Effect.withLogSpan("loadEnabledProviders"),
      Effect.match({
        onFailure: () => {
          applyEnabledProviders(emptyProviders)
        },
        onSuccess: applyEnabledProviders,
      }),
    ),
  )
  runEffect(
    Effect.log("request framing rules").pipe(
      Effect.zipRight(requestFramingRules()),
      Effect.withLogSpan("requestFramingRules"),
      Effect.match({
        onFailure: (error) => {
          setFramingFailed(true)
          setFramingError(handshakeErrorText(error))
        },
        onSuccess: () => {
          setFramingReady(true)
          setFramingError(undefined)
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
        errorDetail: framingError(),
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

  const refreshPanel = (panelId: string): Effect.Effect<void> =>
    Effect.log("refresh panel", panelId).pipe(
      Effect.zipRight(
        Effect.sync(() => {
          const current = slots()
          const slot = current.find((item) => item.id === panelId)
          if (slot === undefined || slot.providerId === null) {
            return
          }
          commitSlots(bumpPanelGeneration(current, panelId))
        }),
      ),
    )

  const persistGrid = (
    layout: LayoutId,
    next: readonly PanelSlot[],
  ): Effect.Effect<boolean, never, Storage> =>
    persistLayoutAndPanelProviders(layout, panelProvidersFromSlots(next)).pipe(
      Effect.as(true),
      Effect.catchTag("StorageWriteError", () => Effect.succeed(false)),
      Effect.catchTag("ParseError", () => Effect.succeed(false)),
    )

  const persistThenApply = (
    layout: LayoutId,
    next: readonly PanelSlot[],
  ): Effect.Effect<void, never, Storage> =>
    persistGrid(layout, next).pipe(
      Effect.flatMap((saved) =>
        saved
          ? Effect.sync(() => {
              batch(() => {
                setLayoutId(layout)
                commitSlots(next)
              })
            })
          : Effect.void,
      ),
    )

  const setPanelProvider = (
    panelId: string,
    rawId: string,
  ): Effect.Effect<void, never, Storage> => {
    const decoded = decodeProviderId(rawId, enabledIds())
    const next =
      decoded === null
        ? slots()
        : replacePanelProvider(slots(), panelId, decoded)
    if (next === slots()) {
      return Effect.void
    }
    return Effect.log("set panel provider", panelId, decoded).pipe(
      Effect.zipRight(persistThenApply(layoutId(), next)),
    )
  }

  const selectLayout = (id: LayoutId) =>
    Effect.log("select layout", id).pipe(
      Effect.zipRight(
        Effect.suspend(() =>
          persistThenApply(
            id,
            resizeSlots(slots(), enabledIds(), cellCount(presetById(id))),
          ),
        ),
      ),
    )

  const changePanelCount = (
    label: string,
    next: () => readonly PanelSlot[],
  ): Effect.Effect<void, never, Storage> =>
    Effect.log(label).pipe(
      Effect.zipRight(
        Effect.suspend(() => {
          const slotsAfter = next()
          return slotsAfter === slots()
            ? Effect.void
            : persistThenApply(
                layoutIdForCellCount(slotsAfter.length),
                slotsAfter,
              )
        }),
      ),
    )

  const addPanel = () =>
    changePanelCount("add panel", () =>
      appendPanelSlot(slots(), enabledIds()),
    )

  const removePanel = (panelId: string) =>
    changePanelCount(`remove panel ${panelId}`, () =>
      removePanelSlot(slots(), panelId),
    )

  const tracks = () => layoutTrackCounts(layoutId())

  return {
    layoutId,
    layoutColumns: () => tracks().columns,
    layoutRows: () => tracks().rows,
    panels,
    options,
    onPanelLoad,
    selectLayout,
    addPanel,
    removePanel,
    canAddPanel: () => canAddPanel(slots()),
    canRemovePanel: () => canRemovePanel(slots()),
    setPanelProvider,
    refreshPanel,
  }
}

const emptyProviders: readonly Provider[] = []

const emptyLoadedIds: ReadonlySet<string> = new Set()

const embedUrlFor = (providerId: ProviderId | null): string | undefined => {
  if (providerId === null) {
    return undefined
  }
  return Option.getOrUndefined(
    Option.map(getBuiltInProvider(providerId), (definition) => definition.url),
  )
}
