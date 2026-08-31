import { Effect, ManagedRuntime } from "effect"
import { layoutIdOrDefault } from "@domain/layout/presets"
import { loadWorkspaceSettings } from "@domain/settings/workspace-settings-storage"
import { workspaceLive } from "@infrastructure/layers"
import { bindViewModel } from "@ui/common/viewmodel/bind-viewmodel"
import { createPanelGridViewModel } from "@ui/workspace/panel-grid/view-model"

const managedRuntime = ManagedRuntime.make(workspaceLive)
const runtime = Effect.runSync(managedRuntime)

export const workspaceBindingsReady = managedRuntime.runPromise(
  loadWorkspaceSettings().pipe(
    Effect.map((settings) =>
      bindViewModel(runtime, (runEffect) =>
        createPanelGridViewModel(
          runEffect,
          layoutIdOrDefault(settings.layout),
        ),
      ),
    ),
  ),
)
