import { Effect } from "effect"
import { createSignal } from "solid-js"
import type { Provider } from "@domain/provider/provider"
import { listEnabledProviders } from "@domain/provider/registry"
import type { Messaging } from "@domain/ports/messaging"
import type { Storage } from "@domain/ports/storage"
import type { Tabs } from "@domain/ports/tabs"
import { requestFramingRules } from "@domain/workspace/request-framing-rules"
import type { RunEffect } from "@ui/common/viewmodel/bind-viewmodel"
import { panelIdAt, toPanelViewState, type PanelViewState } from "./model"

export type PanelGridViewModel = {
  readonly panels: () => readonly PanelViewState[]
  readonly onPanelLoad: (id: string) => void
}

export const createPanelGridViewModel = (
  runEffect: RunEffect<Storage | Tabs | Messaging>,
): PanelGridViewModel => {
  const [providers, setProviders] =
    createSignal<readonly Provider[]>(emptyProviders)
  const [framingReady, setFramingReady] = createSignal(false)
  const [framingFailed, setFramingFailed] = createSignal(false)
  const [loadedPanelIds, setLoadedPanelIds] =
    createSignal<ReadonlySet<string>>(emptyLoadedIds)

  runEffect(
    listEnabledProviders().pipe(
      Effect.match({
        onFailure: () => undefined,
        onSuccess: (list) => {
          setProviders(list)
        },
      }),
    ),
  )
  runEffect(
    requestFramingRules().pipe(
      Effect.match({
        onFailure: () => {
          setFramingFailed(true)
        },
        onSuccess: () => {
          setFramingReady(true)
        },
      }),
    ),
  )

  const panels = (): readonly PanelViewState[] =>
    providers().map((provider, index) =>
      toPanelViewState(provider, index, {
        framingReady: framingReady(),
        failed: framingFailed(),
        hasLoaded: loadedPanelIds().has(panelIdAt(index)),
      }),
    )

  const onPanelLoad = (id: string): void => {
    setLoadedPanelIds((current) => {
      const next = new Set(current)
      next.add(id)
      return next
    })
  }

  return { panels, onPanelLoad }
}

const emptyProviders: readonly Provider[] = []

const emptyLoadedIds: ReadonlySet<string> = new Set()
