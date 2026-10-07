import { For } from "solid-js"
import { themeOptions, type ThemeOption } from "./model"
import "./view.css"

export type ThemePickerViewProps = {
  readonly selectedTheme: () => ThemeOption["id"]
  readonly saveError: () => string | undefined
  readonly onThemeChange: (theme: ThemeOption["id"]) => void
}

export const ThemePickerView = (props: ThemePickerViewProps) => (
  <form
    class="theme-picker"
    onSubmit={(event) => {
      event.preventDefault()
    }}
  >
    <fieldset>
      <legend>Theme</legend>
      <For each={themeOptions}>
        {(option) => (
          <label for={`theme-${option.id}`}>
            <input
              type="radio"
              id={`theme-${option.id}`}
              name="theme"
              value={option.id}
              checked={props.selectedTheme() === option.id}
              onChange={() => props.onThemeChange(option.id)}
            />
            {option.label}
          </label>
        )}
      </For>
    </fieldset>
    {props.saveError() !== undefined && (
      <p class="theme-picker-alert" role="alert">
        {props.saveError()}
      </p>
    )}
  </form>
)
