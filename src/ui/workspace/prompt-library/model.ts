import type { PromptSort } from "@domain/prompt/prompt-query"

export type { PromptSort }

export type PromptLibraryMode = "browse" | "edit"

export type ListedPrompt = {
  readonly id: string
  readonly title: string
  readonly body: string
  readonly tags: readonly string[]
  readonly favorite: boolean
}

export type PromptEditorDraft = {
  readonly promptId: string | undefined
  readonly title: string
  readonly body: string
  readonly tags: string
}

export type SortOption = {
  readonly id: PromptSort
  readonly label: string
}

export const libraryButtonLabel = "Library"
export const libraryHeading = "Library"
export const libraryShortcutText = "Ctrl/Cmd+Shift+L"
export const closeLibraryLabel = "Close"
export const searchLabel = "Search"
export const tagLabel = "Tag"
export const favoritesOnlyLabel = "Favorites only"
export const sortLabel = "Sort"
export const emptyLibraryText = "No prompts yet."
export const newPromptLabel = "New prompt"
export const editPromptLabel = "Edit prompt"
export const starLabel = "Star"
export const starredLabel = "Starred"
export const applyLabel = "Apply"
export const editLabel = "Edit"
export const titleLabel = "Title"
export const bodyLabel = "Body"
export const tagsLabel = "Tags"
export const saveLabel = "Save"
export const cancelLabel = "Cancel"
export const deleteLabel = "Delete"
export const couldNotLoadPrompts = "Could not load prompts."
export const promptGoneText = "That prompt is gone."
export const couldNotSaveText = "Could not save."
export const titleRequiredText = "Title is required."

export const sortOptions: readonly SortOption[] = [
  { id: "updated", label: "Updated" },
  { id: "recent", label: "Recent" },
  { id: "title", label: "Title" },
]

export const emptyEditorDraft = (): PromptEditorDraft => ({
  promptId: undefined,
  title: "",
  body: "",
  tags: "",
})

export const splitTags = (text: string): readonly string[] =>
  text === "" ? [] : text.split(",")

export const joinTags = (tags: readonly string[]): string => tags.join(", ")

export const promptSortFromSelect = (value: string): PromptSort => {
  if (value === "recent" || value === "title" || value === "updated") {
    return value
  }
  return "updated"
}
