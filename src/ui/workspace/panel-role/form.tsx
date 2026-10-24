import { createEffect, Show } from "solid-js"
import {
  cancelLabel,
  deleteLabel,
  editRoleHeading,
  emptyFieldsText,
  instructionLabel,
  nameLabel,
  newRoleHeading,
  saveLabel,
  type RoleFormState,
} from "./model"

export type PanelRoleFormProps = {
  readonly form: () => RoleFormState
  readonly actionError: () => string | undefined
  readonly onName: (name: string) => void
  readonly onInstruction: (instruction: string) => void
  readonly onSave: () => void
  readonly onClose: () => void
  readonly onDelete: () => void
}

export const PanelRoleForm = (props: PanelRoleFormProps) => {
  let dialog: HTMLDialogElement | undefined

  const bindDialog = (element: HTMLDialogElement): void => {
    dialog = element
    element.setAttribute("closedby", "any")
  }

  createEffect(() => {
    const element = dialog
    if (element === undefined) {
      return
    }
    const shouldOpen = props.form().open
    if (shouldOpen && !element.open) {
      element.showModal()
      return
    }
    if (!shouldOpen && element.open) {
      element.close()
    }
  })

  const heading = (): string => {
    const current = props.form()
    return current.open && current.roleId !== null
      ? editRoleHeading
      : newRoleHeading
  }

  const isEdit = (): boolean => {
    const current = props.form()
    return current.open && current.roleId !== null
  }

  const formName = (): string => {
    const current = props.form()
    return current.open ? current.name : ""
  }

  const formInstruction = (): string => {
    const current = props.form()
    return current.open ? current.instruction : ""
  }

  const fieldInvalid = (): boolean => props.actionError() === emptyFieldsText

  return (
    <dialog
      ref={bindDialog}
      class="panel-role-dialog"
      aria-labelledby="panel-role-heading"
      onClose={() => props.onClose()}
    >
      <form
        class="panel-role-form"
        onSubmit={(event) => {
          event.preventDefault()
          props.onSave()
        }}
      >
        <h2 id="panel-role-heading">{heading()}</h2>
        <Show when={props.actionError()}>
          {(message) => (
            <p class="panel-role-alert" role="alert">
              {message()}
            </p>
          )}
        </Show>
        <label for="panel-role-name">
          {nameLabel}
          <input
            id="panel-role-name"
            type="text"
            autocomplete="off"
            aria-invalid={fieldInvalid()}
            value={formName()}
            onInput={(event) => props.onName(event.currentTarget.value)}
          />
        </label>
        <label for="panel-role-instruction">
          {instructionLabel}
          <textarea
            id="panel-role-instruction"
            autocomplete="off"
            aria-invalid={fieldInvalid()}
            value={formInstruction()}
            onInput={(event) =>
              props.onInstruction(event.currentTarget.value)
            }
          />
        </label>
        <div class="panel-role-actions">
          <button type="submit" class="panel-role-primary">
            {saveLabel}
          </button>
          <button type="button" onClick={() => props.onClose()}>
            {cancelLabel}
          </button>
          <Show when={isEdit()}>
            <button type="button" onClick={() => props.onDelete()}>
              {deleteLabel}
            </button>
          </Show>
        </div>
      </form>
    </dialog>
  )
}
