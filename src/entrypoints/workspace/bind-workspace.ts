import { Effect, ManagedRuntime } from "effect"
import { workspaceLive } from "@infrastructure/layers"
import { bindViewModel } from "@ui/common/viewmodel/bind-viewmodel"
import { createPanelGridViewModel } from "@ui/workspace/panel-grid/view-model"

const managedRuntime = ManagedRuntime.make(workspaceLive)
const runtime = Effect.runSync(managedRuntime)

export const workspaceBindings = bindViewModel(
  runtime,
  createPanelGridViewModel,
)
