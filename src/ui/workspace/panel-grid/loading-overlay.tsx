import { Show } from "solid-js"

export const LoadingOverlay = (props: {
  title: string
  iconSrc?: string
  visible: boolean
  failed?: boolean
}) => (
  <Show when={props.visible}>
    <div class="loading-overlay">
      <Show
        when={props.iconSrc}
        fallback={
          <span aria-hidden="true">{props.title.slice(0, 1)}</span>
        }
      >
        {(iconSrc) => <img src={iconSrc()} alt="" aria-hidden="true" />}
      </Show>
      <span>
        {props.failed === true ? "Can't load this panel" : "Loading …"}
      </span>
    </div>
  </Show>
)
