import { For, Show } from "solid-js"
import {
  applyLabel,
  editLabel,
  emptyLibraryText,
  favoritesOnlyLabel,
  newPromptLabel,
  promptSortFromSelect,
  searchLabel,
  sortLabel,
  sortOptions,
  starLabel,
  starredLabel,
  tagLabel,
  type ListedPrompt,
  type PendingLibraryExport,
  type PromptSort,
} from "./model"
import { PromptLibraryTransfer } from "./transfer"

export type PromptLibraryListProps = {
  readonly prompts: () => readonly ListedPrompt[]
  readonly visiblePrompts: () => readonly ListedPrompt[]
  readonly loadError: () => string | undefined
  readonly search: () => string
  readonly tag: () => string
  readonly favoritesOnly: () => boolean
  readonly sort: () => PromptSort
  readonly onSearch: (search: string) => void
  readonly onTag: (tag: string) => void
  readonly onFavoritesOnly: (favoritesOnly: boolean) => void
  readonly onSort: (sort: PromptSort) => void
  readonly onCreate: () => void
  readonly pendingExport: () => PendingLibraryExport | undefined
  readonly onExport: () => void
  readonly onImportText: (text: string) => void
  readonly onFailImportRead: () => void
  readonly onExportConsumed: () => void
  readonly onFavorite: (id: string, favorite: boolean) => void
  readonly onApply: (prompt: ListedPrompt) => void
  readonly onEdit: (prompt: ListedPrompt) => void
}

export const PromptLibraryList = (props: PromptLibraryListProps) => {
  const showEmpty = () =>
    props.prompts().length === 0 && props.loadError() === undefined

  return (
    <div class="prompt-library-browse">
      <search>
        <form
          class="prompt-library-filters"
          onSubmit={(event) => {
            event.preventDefault()
          }}
        >
          <label for="prompt-library-search">
            {searchLabel}
            <input
              id="prompt-library-search"
              type="search"
              value={props.search()}
              onInput={(event) => props.onSearch(event.currentTarget.value)}
            />
          </label>
          <label for="prompt-library-tag">
            {tagLabel}
            <input
              id="prompt-library-tag"
              type="text"
              value={props.tag()}
              onInput={(event) => props.onTag(event.currentTarget.value)}
            />
          </label>
          <label class="prompt-library-favorites" for="prompt-library-favorites">
            <input
              id="prompt-library-favorites"
              type="checkbox"
              checked={props.favoritesOnly()}
              onChange={(event) =>
                props.onFavoritesOnly(event.currentTarget.checked)
              }
            />
            {favoritesOnlyLabel}
          </label>
          <label for="prompt-library-sort">
            {sortLabel}
            <select
              id="prompt-library-sort"
              value={props.sort()}
              onChange={(event) =>
                props.onSort(promptSortFromSelect(event.currentTarget.value))
              }
            >
              <For each={sortOptions}>
                {(option) => <option value={option.id}>{option.label}</option>}
              </For>
            </select>
          </label>
        </form>
      </search>
      <div class="prompt-library-actions">
        <button type="button" onClick={() => props.onCreate()}>
          {newPromptLabel}
        </button>
        <PromptLibraryTransfer
          pendingExport={props.pendingExport}
          exportLibrary={props.onExport}
          importLibraryText={props.onImportText}
          failImportRead={props.onFailImportRead}
          clearPendingExport={props.onExportConsumed}
        />
      </div>
      <Show when={showEmpty()}>
        <p>{emptyLibraryText}</p>
      </Show>
      <Show when={props.visiblePrompts().length > 0}>
        <ul class="prompt-library-rows" aria-label="Prompts">
          <For each={props.visiblePrompts()}>
            {(prompt) => (
              <li class="prompt-library-row">
                <span class="prompt-library-row-title">{prompt.title}</span>
                <button
                  type="button"
                  aria-pressed={prompt.favorite}
                  onClick={() => props.onFavorite(prompt.id, !prompt.favorite)}
                >
                  {prompt.favorite ? starredLabel : starLabel}
                </button>
                <button
                  type="button"
                  class="prompt-library-primary"
                  onClick={() => props.onApply(prompt)}
                >
                  {applyLabel}
                </button>
                <button type="button" onClick={() => props.onEdit(prompt)}>
                  {editLabel}
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  )
}
