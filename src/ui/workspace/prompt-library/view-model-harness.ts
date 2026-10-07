import { Effect, Layer, Runtime } from "effect"
import { createRoot } from "solid-js"
import { inMemoryPromptLibraryLayer } from "@domain/ports/in-memory-prompt-library"
import {
  PromptLibrary,
  PromptLibraryReadError,
  PromptLibraryWriteError,
} from "@domain/ports/prompt-library"
import { queryPrompts } from "@domain/prompt/prompt-query"
import { silentLoggerLayer } from "@test-support/silent-logger"
import type { ListedPrompt } from "./model"
import {
  createPromptLibraryViewModel,
  type PromptLibraryDeps,
  type PromptLibraryViewModel,
} from "./view-model"

const quiet = <Success, Failure, Requirements>(
  layer: Layer.Layer<Success, Failure, Requirements>,
): Layer.Layer<Success, Failure, Requirements> =>
  Layer.merge(layer, silentLoggerLayer)

export const memoryLayer = () => quiet(inMemoryPromptLibraryLayer())

export const seededLayer = (
  initial: readonly unknown[],
) => quiet(inMemoryPromptLibraryLayer(initial))

export const unavailableLibraryLayer = quiet(
  Layer.succeed(PromptLibrary, {
    getAll: () =>
      Effect.fail(new PromptLibraryReadError({ cause: "unavailable" })),
    get: () =>
      Effect.fail(new PromptLibraryReadError({ cause: "unavailable" })),
    put: () =>
      Effect.fail(new PromptLibraryWriteError({ cause: "unavailable" })),
    delete: () =>
      Effect.fail(new PromptLibraryWriteError({ cause: "unavailable" })),
  }),
)

export const idleDeps = (): PromptLibraryDeps => ({
  setDraft: () => undefined,
  focusPrompt: () => undefined,
})

export const recordDeps = () => {
  const drafts: string[] = []
  let focused = 0
  const deps: PromptLibraryDeps = {
    setDraft: (text) => {
      drafts.push(text)
    },
    focusPrompt: () => {
      focused += 1
    },
  }
  return { drafts, focused: () => focused, deps }
}

const openSession = (deps: PromptLibraryDeps) =>
  Effect.gen(function* () {
    const runtime = yield* Effect.runtime<PromptLibrary>()
    return createRoot((dispose) => ({
      vm: createPromptLibraryViewModel((effect) => {
        Runtime.runSync(runtime)(effect)
      }, deps),
      dispose,
    }))
  })

export const runLibrary = <Failure>(
  deps: PromptLibraryDeps,
  check: (
    vm: PromptLibraryViewModel,
  ) => Effect.Effect<void, Failure, PromptLibrary>,
) =>
  Effect.gen(function* () {
    const session = yield* openSession(deps)
    yield* check(session.vm)
    session.dispose()
  })

export const saveNewPrompt = (
  vm: PromptLibraryViewModel,
  title: string,
  body: string,
  tags = "",
) =>
  Effect.gen(function* () {
    vm.startCreate()
    vm.setEditorTitle(title)
    vm.setEditorBody(body)
    vm.setEditorTags(tags)
    yield* vm.save()
  })

export const promptTitles = (vm: PromptLibraryViewModel) =>
  vm.prompts().map((prompt) => prompt.title)

export const onlyPrompt = (vm: PromptLibraryViewModel): ListedPrompt => {
  const prompt = vm.prompts()[0]
  if (prompt === undefined) {
    throw new Error("expected one prompt")
  }
  return prompt
}

export const visibleFromQuery = (vm: PromptLibraryViewModel) =>
  queryPrompts(vm.prompts(), {
    search: vm.search(),
    tag: vm.tag(),
    favoritesOnly: vm.favoritesOnly(),
    sort: vm.sort(),
  })

export const visibleTitles = (vm: PromptLibraryViewModel) =>
  vm.visiblePrompts().map((prompt) => prompt.title)
