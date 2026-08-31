import { Effect, ManagedRuntime, Option } from "effect"
import {
  resolveBroadcastTargets,
  toVisiblePanels,
  upsertFrameHello,
} from "@domain/broadcast/resolve-targets"
import type { PanelTarget } from "@domain/broadcast/panel-target"
import { layoutIdOrDefault } from "@domain/layout/presets"
import { Tabs } from "@domain/ports/tabs"
import { loadWorkspaceSettings } from "@domain/settings/workspace-settings-storage"
import { subscribeWorkspacePanelHellos } from "@infrastructure/chrome/panel-frame-hello"
import { workspaceLive } from "@infrastructure/layers"
import { bindViewModel } from "@ui/common/viewmodel/bind-viewmodel"
import { createPanelGridViewModel } from "@ui/workspace/panel-grid/view-model"
import { createUnifiedInputViewModel } from "@ui/workspace/unified-input/view-model"

const managedRuntime = ManagedRuntime.make(workspaceLive)
const runtime = Effect.runSync(managedRuntime)

export const workspaceBindingsReady = managedRuntime.runPromise(
  Effect.gen(function* () {
    const settings = yield* loadWorkspaceSettings()
    const tabs = yield* Tabs
    const workspaceTabId = yield* tabs.currentTabId().pipe(Effect.option)
    const frames = createFrameList()
    yield* Effect.sync(() => {
      Option.match(workspaceTabId, {
        onNone: () => undefined,
        onSome: (tabId) => {
          subscribeWorkspacePanelHellos(tabId, (hello) => {
            frames.upsert(hello)
          })
        },
      })
    })
    const grid = bindViewModel(runtime, (runEffect) =>
      createPanelGridViewModel(
        runEffect,
        layoutIdOrDefault(settings.layout),
      ),
    )
    return {
      ...grid,
      unifiedInput: bindViewModel(runtime, (runEffect) =>
        createUnifiedInputViewModel(runEffect, () =>
          resolveBroadcastTargets(
            toVisiblePanels(grid.panels()),
            frames.list(),
          ),
        ),
      ),
    }
  }),
)

const createFrameList = () => {
  let rows: readonly PanelTarget[] = []
  return {
    list: (): readonly PanelTarget[] => rows,
    upsert: (incoming: PanelTarget): void => {
      rows = upsertFrameHello(rows, incoming)
    },
  }
}
