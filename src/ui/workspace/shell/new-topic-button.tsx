export const NewTopicButton = (props: { onClick: () => void }) => (
  <button
    type="button"
    class="new-topic-button"
    onClick={props.onClick}
  >
    New topic
  </button>
)
