import { render } from "solid-js/web"
import { OptionsView } from "@ui/options/view"

const root = document.getElementById("root")
if (root !== null) {
  render(() => <OptionsView />, root)
}
