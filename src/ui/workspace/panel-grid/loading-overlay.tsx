import { Show } from "solid-js"

export const LoadingOverlay = (props: {
  title: string
  iconSrc?: string
  visible: boolean
  failed?: boolean
  detail?: string
}) => (
  <Show when={props.visible}>
    <div class="loading-overlay">
      <Show
        when={props.iconSrc}
        fallback={<span>{props.title}</span>}
      >
        {(iconSrc) => <img src={iconSrc()} alt="" aria-hidden="true" />}
      </Show>
      <span>
        {props.failed === true ? "Can't load this panel" : "Loading …"}
      </span>
      <Show when={props.failed === true && props.detail}>
        {(detail) => <span>{detail()}</span>}
      </Show>
    </div>
  </Show>
)
