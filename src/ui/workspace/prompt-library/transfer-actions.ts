import { Either, Effect, Schema } from "effect"
import { createSignal } from "solid-js"
import { PromptLibrary } from "@domain/ports/prompt-library"
import { Prompt } from "@domain/prompt/prompt"
import { listPrompts } from "@domain/prompt/prompt-crud"
import {
  decodePromptLibraryDocument,
  encodePromptLibraryDocument,
  type PromptLibraryDocument,
} from "@domain/prompt/prompt-library-document"
import {
  couldNotImportText,
  couldNotLoadPrompts,
  couldNotReadFileText,
  notPromptLibraryText,
  type PendingLibraryExport,
} from "./model"

export type PromptTransferActions = {
  readonly pendingExport: () => PendingLibraryExport | undefined
  readonly clearPendingExport: () => void
  readonly exportLibrary: () => Effect.Effect<
    string | undefined,
    never,
    PromptLibrary
  >
  readonly importLibraryText: (
    text: string,
  ) => Effect.Effect<void, never, PromptLibrary>
  readonly failImportRead: () => void
}

type PromptTransferHost = {
  readonly setLoadError: (message: string | undefined) => void
  readonly setActionError: (message: string | undefined) => void
  readonly refresh: () => Effect.Effect<void, never, PromptLibrary>
}

const decodeJsonUnknown = Schema.decodeUnknownEither(Schema.parseJson())

const documentFromText = (text: string): PromptLibraryDocument | undefined =>
  Either.match(decodeJsonUnknown(text), {
    onLeft: () => undefined,
    onRight: (value) =>
      Either.match(decodePromptLibraryDocument(value), {
        onLeft: () => undefined,
        onRight: (document) => document,
      }),
  })

const libraryJson = (document: PromptLibraryDocument): string | undefined =>
  Either.match(encodePromptLibraryDocument(document), {
    onLeft: () => undefined,
    onRight: (encoded) => JSON.stringify(encoded),
  })

const putPrompt = (prompt: Prompt) =>
  Effect.gen(function* () {
    const library = yield* PromptLibrary
    const encoded = yield* Schema.encode(Prompt)(prompt)
    yield* library.put(encoded)
  })

export const createPromptTransfer = (
  host: PromptTransferHost,
): PromptTransferActions => {
  const [pendingExport, setPendingExport] = createSignal<
    PendingLibraryExport | undefined
  >(undefined)
  let exportToken = 0

  const exportLibrary = (): Effect.Effect<
    string | undefined,
    never,
    PromptLibrary
  > =>
    listPrompts().pipe(
      Effect.map((prompts) => libraryJson({ version: 1, prompts })),
      Effect.match({
        onFailure: () => {
          host.setLoadError(couldNotLoadPrompts)
          return undefined
        },
        onSuccess: (json) => {
          if (json === undefined) {
            host.setLoadError(couldNotLoadPrompts)
            return undefined
          }
          exportToken += 1
          setPendingExport({ token: exportToken, json })
          return json
        },
      }),
      Effect.withLogSpan("exportLibrary"),
    )

  const importLibraryText = (
    text: string,
  ): Effect.Effect<void, never, PromptLibrary> =>
    Effect.gen(function* () {
      const document = documentFromText(text)
      if (document === undefined) {
        host.setActionError(notPromptLibraryText)
        return
      }
      const wrote = yield* Effect.forEach(document.prompts, putPrompt, {
        concurrency: 1,
      }).pipe(
        Effect.match({
          onFailure: () => false,
          onSuccess: () => true,
        }),
      )
      if (!wrote) {
        host.setActionError(couldNotImportText)
        return
      }
      host.setActionError(undefined)
      yield* host.refresh()
    }).pipe(Effect.withLogSpan("importLibrary"))

  const failImportRead = (): void => {
    host.setActionError(couldNotReadFileText)
  }

  const clearPendingExport = (): void => {
    setPendingExport(undefined)
  }

  return {
    pendingExport,
    clearPendingExport,
    exportLibrary,
    importLibraryText,
    failImportRead,
  }
}
