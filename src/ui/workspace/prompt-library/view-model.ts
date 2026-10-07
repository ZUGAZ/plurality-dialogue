import { Effect } from "effect"
import { createSignal } from "solid-js"
import type { PromptSort } from "@domain/prompt/prompt-query"
import { queryPrompts } from "@domain/prompt/prompt-query"
import type { Prompt } from "@domain/prompt/prompt"
import {
  PromptNotFound,
  createPrompt,
  deletePrompt,
  listPrompts,
  setPromptFavorite,
  updatePrompt,
} from "@domain/prompt/prompt-crud"
import type { PromptLibrary } from "@domain/ports/prompt-library"
import type { RunEffect } from "@ui/common/viewmodel/bind-viewmodel"
import { createPromptFill, type PromptFillActions } from "./fill-actions"
import {
  couldNotLoadPrompts,
  couldNotSaveText,
  emptyEditorDraft,
  joinTags,
  promptGoneText,
  splitTags,
  titleRequiredText,
  type ListedPrompt,
  type PendingPromptFill,
  type PromptEditorDraft,
  type PromptLibraryMode,
} from "./model"

export type PromptLibraryDeps = {
  readonly setDraft: (text: string) => void
  readonly focusPrompt: () => void
}

export type PromptLibraryViewModel = PromptFillActions & {
  readonly isOpen: () => boolean
  readonly mode: () => PromptLibraryMode
  readonly prompts: () => readonly Prompt[]
  readonly visiblePrompts: () => readonly Prompt[]
  readonly search: () => string
  readonly tag: () => string
  readonly favoritesOnly: () => boolean
  readonly sort: () => PromptSort
  readonly editor: () => PromptEditorDraft
  readonly loadError: () => string | undefined
  readonly actionError: () => string | undefined
  readonly open: () => Effect.Effect<void, never, PromptLibrary>
  readonly close: () => Effect.Effect<void, never, PromptLibrary>
  readonly toggle: () => Effect.Effect<void, never, PromptLibrary>
  readonly refresh: () => Effect.Effect<void, never, PromptLibrary>
  readonly setSearch: (search: string) => void
  readonly setTag: (tag: string) => void
  readonly setFavoritesOnly: (favoritesOnly: boolean) => void
  readonly setSort: (sort: PromptSort) => void
  readonly setEditorTitle: (title: string) => void
  readonly setEditorBody: (body: string) => void
  readonly setEditorTags: (tags: string) => void
  readonly setFavorite: (
    id: string,
    favorite: boolean,
  ) => Effect.Effect<void, never, PromptLibrary>
  readonly startCreate: () => void
  readonly startEdit: (prompt: ListedPrompt) => void
  readonly cancelEdit: () => void
  readonly save: () => Effect.Effect<void, never, PromptLibrary>
  readonly remove: () => Effect.Effect<void, never, PromptLibrary>
}

type WriteOutcome = "saved" | "gone" | "failed"

export const createPromptLibraryViewModel = (
  _runEffect: RunEffect<PromptLibrary>,
  deps: PromptLibraryDeps,
): PromptLibraryViewModel => {
  const [isOpen, setIsOpen] = createSignal(false)
  const [mode, setMode] = createSignal<PromptLibraryMode>("browse")
  const [prompts, setPrompts] = createSignal<readonly Prompt[]>([])
  const [search, setSearch] = createSignal("")
  const [tag, setTag] = createSignal("")
  const [favoritesOnly, setFavoritesOnly] = createSignal(false)
  const [sort, setSort] = createSignal<PromptSort>("updated")
  const [editor, setEditor] = createSignal<PromptEditorDraft>(emptyEditorDraft())
  const [pendingFill, setPendingFill] = createSignal<
    PendingPromptFill | undefined
  >(undefined)
  const [loadError, setLoadError] = createSignal<string | undefined>(undefined)
  const [actionError, setActionError] = createSignal<string | undefined>(
    undefined,
  )

  const visiblePrompts = (): readonly Prompt[] =>
    queryPrompts(prompts(), {
      search: search(),
      tag: tag(),
      favoritesOnly: favoritesOnly(),
      sort: sort(),
    })

  const patchEditor = (patch: Partial<PromptEditorDraft>): void => {
    setEditor({ ...editor(), ...patch })
  }

  const returnToBrowse = (): void => {
    setMode("browse")
    setEditor(emptyEditorDraft())
    setActionError(undefined)
  }

  const refresh = (): Effect.Effect<void, never, PromptLibrary> =>
    Effect.log("refresh prompts").pipe(
      Effect.zipRight(listPrompts()),
      Effect.match({
        onFailure: () => {
          setLoadError(couldNotLoadPrompts)
        },
        onSuccess: (loaded) => {
          setPrompts(loaded)
          setLoadError(undefined)
        },
      }),
      Effect.withLogSpan("refresh"),
    )

  const settleWrite = <Success, WriteError>(
    writing: Effect.Effect<Success, WriteError, PromptLibrary>,
  ): Effect.Effect<WriteOutcome, never, PromptLibrary> =>
    writing.pipe(
      Effect.match({
        onFailure: (error): WriteOutcome => {
          if (error instanceof PromptNotFound) {
            setActionError(promptGoneText)
            return "gone"
          }
          setActionError(couldNotSaveText)
          return "failed"
        },
        onSuccess: (): WriteOutcome => "saved",
      }),
    )

  const refreshAfter = (
    outcome: WriteOutcome,
    leaveEditor: boolean,
  ): Effect.Effect<void, never, PromptLibrary> => {
    if (outcome === "failed") {
      return Effect.void
    }
    if (outcome === "saved" && leaveEditor) {
      returnToBrowse()
    }
    if (outcome === "saved") {
      setActionError(undefined)
    }
    return refresh()
  }

  const open = (): Effect.Effect<void, never, PromptLibrary> =>
    Effect.gen(function* () {
      setIsOpen(true)
      setMode("browse")
      setPendingFill(undefined)
      setActionError(undefined)
      yield* refresh()
    }).pipe(Effect.withLogSpan("open"))

  const close = (): Effect.Effect<void, never, PromptLibrary> =>
    Effect.sync(() => {
      setIsOpen(false)
    })

  const toggle = (): Effect.Effect<void, never, PromptLibrary> =>
    Effect.gen(function* () {
      if (isOpen()) {
        yield* close()
        return
      }
      yield* open()
    })

  const save = (): Effect.Effect<void, never, PromptLibrary> =>
    Effect.gen(function* () {
      const draft = editor()
      if (draft.title.trim() === "") {
        setActionError(titleRequiredText)
        return
      }
      const fields = {
        title: draft.title,
        body: draft.body,
        tags: splitTags(draft.tags),
      }
      const writing =
        draft.promptId === undefined
          ? createPrompt(fields)
          : updatePrompt(draft.promptId, fields)
      const outcome = yield* settleWrite(writing)
      yield* refreshAfter(outcome, true)
    }).pipe(Effect.withLogSpan("save"))

  const remove = (): Effect.Effect<void, never, PromptLibrary> =>
    Effect.gen(function* () {
      const promptId = editor().promptId
      if (promptId === undefined) {
        return
      }
      const outcome = yield* settleWrite(deletePrompt(promptId))
      yield* refreshAfter(outcome, true)
    }).pipe(Effect.withLogSpan("remove"))

  const setFavorite = (
    id: string,
    favorite: boolean,
  ): Effect.Effect<void, never, PromptLibrary> =>
    Effect.gen(function* () {
      const outcome = yield* settleWrite(setPromptFavorite(id, favorite))
      yield* refreshAfter(outcome, false)
    })

  const startCreate = (): void => {
    setMode("edit")
    setActionError(undefined)
    setEditor(emptyEditorDraft())
  }

  const startEdit = (prompt: ListedPrompt): void => {
    setMode("edit")
    setActionError(undefined)
    setEditor({
      promptId: prompt.id,
      title: prompt.title,
      body: prompt.body,
      tags: joinTags(prompt.tags),
    })
  }

  const cancelEdit = (): void => {
    returnToBrowse()
  }

  const fill = createPromptFill({
    pending: pendingFill,
    setPending: setPendingFill,
    setMode,
    setOpen: setIsOpen,
    setDraft: deps.setDraft,
    focusPrompt: deps.focusPrompt,
  })

  return {
    isOpen,
    mode,
    prompts,
    visiblePrompts,
    search,
    tag,
    favoritesOnly,
    sort,
    editor,
    loadError,
    actionError,
    open,
    close,
    toggle,
    refresh,
    setSearch,
    setTag,
    setFavoritesOnly,
    setSort,
    setEditorTitle: (title) => {
      patchEditor({ title })
    },
    setEditorBody: (body) => {
      patchEditor({ body })
    },
    setEditorTags: (tags) => {
      patchEditor({ tags })
    },
    setFavorite,
    startCreate,
    startEdit,
    cancelEdit,
    save,
    remove,
    ...fill,
  }
}
