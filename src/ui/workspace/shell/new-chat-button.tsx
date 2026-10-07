export const NewChatButton = (props: { onClick: () => void }) => (
  <button
    type="button"
    class="new-chat-button"
    aria-label="New Chat for All"
    onClick={props.onClick}
  >
    New Chat
  </button>
)
