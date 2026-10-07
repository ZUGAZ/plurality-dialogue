import { Effect, ManagedRuntime } from "effect"
import { optionsLive } from "@infrastructure/layers"
import { themeToColorScheme } from "@domain/settings/theme-preference"
import { loadWorkspaceSettings } from "@domain/settings/workspace-settings-storage"
import { bindViewModel } from "@ui/common/viewmodel/bind-viewmodel"
import { createProviderTogglesViewModel } from "@ui/options/provider-toggles/view-model"
import { createThemePickerViewModel } from "@ui/options/theme-picker/view-model"

const managedRuntime = ManagedRuntime.make(optionsLive)
const runtime = Effect.runSync(managedRuntime)

export const optionsBindingsReady = managedRuntime.runPromise(
  Effect.gen(function* () {
    yield* Effect.log("runtime initialized")
    const settings = yield* loadWorkspaceSettings()
    yield* Effect.sync(() => {
      document.documentElement.style.colorScheme = themeToColorScheme(
        settings.theme,
      )
    })
    return {
      providers: bindViewModel(
        runtime,
        "providerToggles",
        createProviderTogglesViewModel,
      ),
      theme: bindViewModel(runtime, "themePicker", createThemePickerViewModel),
    }
  }).pipe(Effect.withLogSpan("options")),
)
