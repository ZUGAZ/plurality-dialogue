import { render } from "solid-js/web"
import { OptionsView } from "@ui/options/view"
import { optionsBindingsReady } from "./bind-options"

const root = document.getElementById("root")
if (root !== null) {
  void optionsBindingsReady.then((bindings) => {
    render(
      () => (
        <OptionsView
          rows={bindings.rows}
          loadError={bindings.loadError}
          saveError={bindings.saveError}
          onEnabledChange={bindings.setEnabled}
        />
      ),
      root,
    )
  })
}
