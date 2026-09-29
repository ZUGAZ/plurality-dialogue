import { For } from "solid-js"
import type { ProviderToggleRow } from "./model"
import "./view.css"

export type ProviderTogglesViewProps = {
  readonly rows: () => readonly ProviderToggleRow[]
  readonly loadError: () => string | undefined
  readonly saveError: () => string | undefined
  readonly onEnabledChange: (
    id: ProviderToggleRow["id"],
    enabled: boolean,
  ) => void
}

const hintId = "provider-toggles-hint"

export const ProviderTogglesView = (props: ProviderTogglesViewProps) => {
  const alertText = () => props.loadError() ?? props.saveError()
  return (
    <form
      class="provider-toggles"
      onSubmit={(event) => {
        event.preventDefault()
      }}
    >
      <fieldset aria-describedby={hintId}>
        <legend>Providers</legend>
        <p id={hintId} class="provider-toggles-hint">
          Chats that are on appear in the workspace. At least one must stay on.
        </p>
        <For each={props.rows()}>
          {(row) => (
            <label for={`provider-${row.id}`}>
              <input
                type="checkbox"
                id={`provider-${row.id}`}
                name={row.id}
                checked={row.isEnabled}
                disabled={row.isLastEnabled}
                onChange={(event) =>
                  props.onEnabledChange(row.id, event.currentTarget.checked)
                }
              />
              {row.label}
            </label>
          )}
        </For>
      </fieldset>
      {alertText() !== undefined && (
        <p class="provider-toggles-alert" role="alert">
          {alertText()}
        </p>
      )}
    </form>
  )
}
