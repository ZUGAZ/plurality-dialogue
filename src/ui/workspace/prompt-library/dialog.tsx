import { createEffect, Show } from "solid-js"
import { PromptEditor } from "./editor"
import { PromptFill } from "./fill"
import { PromptLibraryList } from "./list"
import {
  closeLibraryLabel,
  libraryHeading,
  libraryShortcutText,
  type FillValues,
  type ListedPrompt,
  type PromptEditorDraft,
  type PromptLibraryMode,
  type PromptSort,
} from "./model"
import "./view.css"

export type PromptLibraryDialogProps = {
  readonly isOpen: () => boolean
  readonly mode: () => PromptLibraryMode
  readonly prompts: () => readonly ListedPrompt[]
  readonly visiblePrompts: () => readonly ListedPrompt[]
  readonly search: () => string
  readonly tag: () => string
  readonly favoritesOnly: () => boolean
  readonly sort: () => PromptSort
  readonly editor: () => PromptEditorDraft
  readonly loadError: () => string | undefined
  readonly actionError: () => string | undefined
  readonly close: () => void
  readonly setSearch: (search: string) => void
  readonly setTag: (tag: string) => void
  readonly setFavoritesOnly: (favoritesOnly: boolean) => void
  readonly setSort: (sort: PromptSort) => void
  readonly setEditorTitle: (title: string) => void
  readonly setEditorBody: (body: string) => void
  readonly setEditorTags: (tags: string) => void
  readonly setFavorite: (id: string, favorite: boolean) => void
  readonly startCreate: () => void
  readonly startEdit: (prompt: ListedPrompt) => void
  readonly cancelEdit: () => void
  readonly save: () => void
  readonly remove: () => void
  readonly applyPrompt: (prompt: ListedPrompt) => void
  readonly fillTitle: () => string
  readonly fillNames: () => readonly string[]
  readonly fillValues: () => FillValues
  readonly setFillValue: (name: string, value: string) => void
  readonly cancelFill: () => void
  readonly insertFill: () => void
}

export const PromptLibraryDialog = (props: PromptLibraryDialogProps) => {
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
    const shouldOpen = props.isOpen()
    if (shouldOpen && !element.open) {
      element.showModal()
      return
    }
    if (!shouldOpen && element.open) {
      element.close()
    }
  })

  return (
    <dialog
      ref={bindDialog}
      class="prompt-library"
      aria-labelledby="prompt-library-heading"
      onClose={() => props.close()}
    >
      <header class="prompt-library-header">
        <div>
          <h2 id="prompt-library-heading">{libraryHeading}</h2>
          <p class="prompt-library-shortcut">{libraryShortcutText}</p>
        </div>
        <form method="dialog">
          <button type="submit">{closeLibraryLabel}</button>
        </form>
      </header>
      <Show when={props.loadError()}>
        {(message) => <p class="prompt-library-load-error">{message()}</p>}
      </Show>
      <Show when={props.actionError()}>
        {(message) => (
          <p class="prompt-library-alert" role="alert">
            {message()}
          </p>
        )}
      </Show>
      <Show when={props.mode() === "browse"}>
        <PromptLibraryList
          prompts={props.prompts}
          visiblePrompts={props.visiblePrompts}
          loadError={props.loadError}
          search={props.search}
          tag={props.tag}
          favoritesOnly={props.favoritesOnly}
          sort={props.sort}
          onSearch={props.setSearch}
          onTag={props.setTag}
          onFavoritesOnly={props.setFavoritesOnly}
          onSort={props.setSort}
          onCreate={props.startCreate}
          onFavorite={props.setFavorite}
          onApply={props.applyPrompt}
          onEdit={props.startEdit}
        />
      </Show>
      <Show when={props.mode() === "edit"}>
        <PromptEditor
          draft={props.editor}
          actionError={props.actionError}
          onTitle={props.setEditorTitle}
          onBody={props.setEditorBody}
          onTags={props.setEditorTags}
          onSave={props.save}
          onCancel={props.cancelEdit}
          onDelete={props.remove}
        />
      </Show>
      <Show when={props.mode() === "fill"}>
        <PromptFill
          title={props.fillTitle}
          names={props.fillNames}
          values={props.fillValues}
          onValue={props.setFillValue}
          onInsert={props.insertFill}
          onCancel={props.cancelFill}
        />
      </Show>
    </dialog>
  )
}
