export const AddPanelButton = (props: {
  canAdd: boolean
  onAdd: () => void
}) => (
  <button
    type="button"
    class="add-panel-button"
    aria-label="Add panel"
    disabled={!props.canAdd}
    onClick={() => props.onAdd()}
  >
    +
  </button>
)
