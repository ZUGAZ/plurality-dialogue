import { render } from "solid-js/web"
import { OptionsView } from "@ui/options/view"
import { optionsBindingsReady } from "./bind-options"

const root = document.getElementById("root")
if (root !== null) {
  void optionsBindingsReady.then((bindings) => {
    render(
      () => (
        <OptionsView
          providers={{
            rows: bindings.providers.rows,
            loadError: bindings.providers.loadError,
            saveError: bindings.providers.saveError,
            onEnabledChange: bindings.providers.setEnabled,
          }}
          theme={{
            selectedTheme: bindings.theme.selectedTheme,
            saveError: bindings.theme.saveError,
            onThemeChange: bindings.theme.setTheme,
          }}
        />
      ),
      root,
    )
  })
}
