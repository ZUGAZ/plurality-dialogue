import { Effect } from "effect"
import {
  cellCount,
  layoutIdForCellCountOnTrack,
  presetById,
  type LayoutId,
} from "@domain/layout/presets"
import type { Storage } from "@domain/ports/storage"
import type { ProviderId } from "@domain/provider/provider-id"
import { persistPanelRoles } from "@domain/role/assign-panel-role"
import type { PanelRoles } from "@domain/role/panel-roles"
import { realignPanelRoles } from "@domain/role/panel-roles"
import { persistLayoutAndPanelProviders } from "@ui/workspace/layout-presets/view-model"
import { decodeProviderId, type PanelSlot } from "./model"
import {
  appendPanelSlot,
  panelProvidersFromSlots,
  removePanelSlot,
  replacePanelProvider,
  resizeSlots,
} from "./slots"

export type PersistedGridActions = {
  readonly setPanelProvider: (
    panelId: string,
    rawId: string,
  ) => Effect.Effect<void, never, Storage>
  readonly selectLayout: (
    id: LayoutId,
  ) => Effect.Effect<void, never, Storage>
  readonly addPanel: () => Effect.Effect<void, never, Storage>
  readonly removePanel: (
    panelId: string,
  ) => Effect.Effect<void, never, Storage>
}

export type PanelRoleSync = {
  readonly panelRoles: () => PanelRoles | undefined
  readonly applyPanelRoles: (next: PanelRoles | undefined) => void
}

type PersistedGridState = {
  readonly slots: () => readonly PanelSlot[]
  readonly layoutId: () => LayoutId
  readonly enabledIds: () => readonly ProviderId[]
  readonly applySavedGrid: (
    layout: LayoutId,
    next: readonly PanelSlot[],
  ) => void
  readonly panelRoles: () => PanelRoles | undefined
  readonly applyPanelRoles: (next: PanelRoles | undefined) => void
}

const slotIds = (slots: readonly PanelSlot[]): readonly string[] =>
  slots.map((slot) => slot.id)

const idsEqual = (
  a: readonly string[],
  b: readonly string[],
): boolean =>
  a.length === b.length && a.every((id, i) => id === b[i])

export const createPersistedGridActions = (
  state: PersistedGridState,
): PersistedGridActions => {
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
    Effect.gen(function* () {
      const currentIds = slotIds(state.slots())
      const nextIds = slotIds(next)
      const idsChanged = !idsEqual(currentIds, nextIds)
      const nextRoles = idsChanged
        ? realignPanelRoles(
            { panelIds: currentIds, panelRoles: state.panelRoles() },
            nextIds,
          )
        : undefined

      const gridSaved = yield* persistGrid(layout, next)
      if (!gridSaved) {
        return
      }

      if (idsChanged && Array.isArray(nextRoles)) {
        // Ids are renumbered on the next slotsFromPanelProviders load, so a
        // missed realign cannot be repaired later.
        const roleSaved = yield* persistPanelRoles(nextRoles).pipe(
          Effect.as(true),
          Effect.catchTag("StorageWriteError", () => Effect.succeed(false)),
          Effect.catchTag("ParseError", () => Effect.succeed(false)),
        )
        if (!roleSaved) {
          return
        }
        state.applySavedGrid(layout, next)
        state.applyPanelRoles(nextRoles)
      } else {
        state.applySavedGrid(layout, next)
      }
    })

  const setPanelProvider = (
    panelId: string,
    rawId: string,
  ): Effect.Effect<void, never, Storage> => {
    const decoded = decodeProviderId(rawId, state.enabledIds())
    const next =
      decoded === null
        ? state.slots()
        : replacePanelProvider(state.slots(), panelId, decoded)
    if (next === state.slots()) {
      return Effect.void
    }
    return Effect.log("set panel provider", panelId, decoded).pipe(
      Effect.zipRight(persistThenApply(state.layoutId(), next)),
    )
  }

  const selectLayout = (id: LayoutId) =>
    Effect.log("select layout", id).pipe(
      Effect.zipRight(
        Effect.suspend(() =>
          persistThenApply(
            id,
            resizeSlots(
              state.slots(),
              state.enabledIds(),
              cellCount(presetById(id)),
            ),
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
          return slotsAfter === state.slots()
            ? Effect.void
            : persistThenApply(
                layoutIdForCellCountOnTrack(
                  slotsAfter.length,
                  state.layoutId(),
                ),
                slotsAfter,
              )
        }),
      ),
    )

  const addPanel = () =>
    changePanelCount("add panel", () =>
      appendPanelSlot(state.slots(), state.enabledIds()),
    )

  const removePanel = (panelId: string) =>
    changePanelCount(`remove panel ${panelId}`, () =>
      removePanelSlot(state.slots(), panelId),
    )

  return {
    setPanelProvider,
    selectLayout,
    addPanel,
    removePanel,
  }
}
