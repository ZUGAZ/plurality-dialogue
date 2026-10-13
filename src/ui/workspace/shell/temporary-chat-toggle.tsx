export const TemporaryChatToggle = (props: {
  pressed: () => boolean
  onToggle: () => void
}) => (
  <button
    type="button"
    class="temporary-chat-toggle"
    aria-pressed={props.pressed() ? "true" : "false"}
    aria-label="Temporary chat"
    onClick={props.onToggle}
  >
    Temporary chat
  </button>
)
