import { Effect } from "effect"
import {
  listPlaceholders,
  substitutePlaceholders,
} from "@domain/prompt/prompt-placeholders"
import { touchPromptUsed } from "@domain/prompt/prompt-crud"
import type { PromptLibrary } from "@domain/ports/prompt-library"
import {
  emptyFillValues,
  type FillValues,
  type ListedPrompt,
  type PendingPromptFill,
  type PromptLibraryMode,
} from "./model"

export type PromptFillActions = {
  readonly fillTitle: () => string
  readonly fillNames: () => readonly string[]
  readonly fillValues: () => FillValues
  readonly setFillValue: (name: string, value: string) => void
  readonly cancelFill: () => void
  readonly insertFill: () => Effect.Effect<void, never, PromptLibrary>
  readonly applyPrompt: (
    prompt: ListedPrompt,
  ) => Effect.Effect<void, never, PromptLibrary>
}

type PromptFillHost = {
  readonly pending: () => PendingPromptFill | undefined
  readonly setPending: (next: PendingPromptFill | undefined) => void
  readonly setMode: (mode: PromptLibraryMode) => void
  readonly setOpen: (open: boolean) => void
  readonly setDraft: (text: string) => void
  readonly focusPrompt: () => void
}

export const createPromptFill = (host: PromptFillHost): PromptFillActions => {
  const commitBody = (
    promptId: string,
    body: string,
  ): Effect.Effect<void, never, PromptLibrary> =>
    Effect.gen(function* () {
      host.setDraft(body)
      yield* touchPromptUsed(promptId).pipe(Effect.ignore)
      host.setOpen(false)
      // Closing the modal restores focus to the opener. Focus the prompt
      // after that so Apply leaves the caret in the bar.
      yield* Effect.sync(() => {
        queueMicrotask(host.focusPrompt)
      })
    })

  const applyPrompt = (
    prompt: ListedPrompt,
  ): Effect.Effect<void, never, PromptLibrary> =>
    Effect.gen(function* () {
      yield* Effect.log("apply prompt", prompt.id)
      const names = listPlaceholders(prompt.body)
      if (names.length === 0) {
        host.setPending(undefined)
        yield* commitBody(prompt.id, prompt.body)
        return
      }
      host.setPending({
        prompt,
        names,
        values: emptyFillValues(names),
      })
      host.setMode("fill")
    }).pipe(Effect.withLogSpan("applyPrompt"))

  const setFillValue = (name: string, value: string): void => {
    const current = host.pending()
    if (current === undefined) {
      return
    }
    host.setPending({
      ...current,
      values: { ...current.values, [name]: value },
    })
  }

  const cancelFill = (): void => {
    host.setMode("browse")
    host.setPending(undefined)
  }

  const insertFill = (): Effect.Effect<void, never, PromptLibrary> =>
    Effect.gen(function* () {
      const current = host.pending()
      if (current === undefined) {
        return
      }
      const body = substitutePlaceholders(
        current.prompt.body,
        current.values,
      )
      yield* commitBody(current.prompt.id, body)
      host.setPending(undefined)
    }).pipe(Effect.withLogSpan("insertFill"))

  const fillTitle = (): string => host.pending()?.prompt.title ?? ""

  const fillNames = (): readonly string[] => host.pending()?.names ?? []

  const fillValues = (): FillValues =>
    host.pending()?.values ?? emptyFillValues([])

  return {
    fillTitle,
    fillNames,
    fillValues,
    setFillValue,
    cancelFill,
    insertFill,
    applyPrompt,
  }
}
