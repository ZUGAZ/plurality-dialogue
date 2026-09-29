import { Effect, ManagedRuntime } from "effect"
import { optionsLive } from "@infrastructure/layers"
import { bindViewModel } from "@ui/common/viewmodel/bind-viewmodel"
import { createProviderTogglesViewModel } from "@ui/options/provider-toggles/view-model"

const managedRuntime = ManagedRuntime.make(optionsLive)
const runtime = Effect.runSync(managedRuntime)

export const optionsBindingsReady = managedRuntime.runPromise(
  Effect.gen(function* () {
    yield* Effect.log("runtime initialized")
    return bindViewModel(
      runtime,
      "providerToggles",
      createProviderTogglesViewModel,
    )
  }).pipe(Effect.withLogSpan("options")),
)
