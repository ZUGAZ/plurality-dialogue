import { Show } from "solid-js"

export const PanelRoleAlert = (props: {
  error: () => string | undefined
}) => (
  <Show when={props.error()}>
    {(message) => (
      <p class="panel-role-banner" role="alert">
        {message()}
      </p>
    )}
  </Show>
)
