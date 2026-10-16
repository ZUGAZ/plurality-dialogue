import { Effect, Layer, Ref, Runtime } from "effect"
import { silentLoggerLayer } from "@test-support/silent-logger"
import { describe, expect, it } from "@effect/vitest"
import type { PanelTarget } from "@domain/broadcast/panel-target"
import { FramingRulesReady } from "@domain/messaging/ensure-framing-rules"
import {
  inMemoryMessagingLayer,
  type InMemoryFrameMessaging,
} from "@domain/ports/in-memory-messaging"
import {
  inMemoryTabsLayer,
  type TabsMemoryState,
} from "@domain/ports/in-memory-tabs"
import { inMemoryStorageLayer } from "@domain/ports/in-memory-storage"
import { Messaging } from "@domain/ports/messaging"
import { Storage } from "@domain/ports/storage"
import { Tabs } from "@domain/ports/tabs"
import { builtInProviders } from "@domain/provider/built-in-providers"
import { defaultLayoutId } from "@domain/layout/presets"
import { workspaceSettingsStorageKey } from "@domain/settings/workspace-settings"
import { createPanelGridViewModel } from "./view-model"

const claude = builtInProviders.find((row) => row.id === "claude")

const threadHref =
  claude === undefined
    ? ""
    : `https://${claude.host}/chat/00000000-0000-4000-8000-000000000002`

const panelTwoHello: PanelTarget = {
  panelId: "panel-2",
  providerId: "claude",
  tabId: 3,
  frameId: 1,
}

const readyStore = (): TabsMemoryState => ({
  rows: [],
  lastFocusedId: 1,
  nextId: 2,
})

const openTabLayer = (
  store: Ref.Ref<TabsMemoryState>,
  frames: InMemoryFrameMessaging,
  storage: Readonly<Record<string, unknown>> = {},
) =>
  Layer.mergeAll(
    inMemoryStorageLayer(storage),
    inMemoryTabsLayer(store),
    inMemoryMessagingLayer(
      () => Effect.succeed(FramingRulesReady.make({})),
      frames,
    ),
    silentLoggerLayer,
  )

describe("open panel in tab", () => {
  it.effect("opens panel-2 at the mapped thread href", () =>
    Effect.gen(function* () {
      const store = yield* Ref.make(readyStore())
      const frames: InMemoryFrameMessaging = {
        replies: new Map(),
        sent: [],
        locations: new Map([["panel-2", threadHref]]),
      }
      yield* Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Storage | Tabs | Messaging>()
        const vm = createPanelGridViewModel(
          (effect) => {
            Runtime.runSync(runtime)(effect)
          },
          { layoutId: defaultLayoutId },
          () => [panelTwoHello],
        )
        const generation = vm.panels()[1]?.reloadGeneration
        yield* vm.openPanelInTab("panel-2")
        const state = yield* Ref.get(store)
        expect(state.rows).toHaveLength(1)
        expect(state.rows[0]?.url).toBe(threadHref)
        expect(vm.panels()[1]?.reloadGeneration).toBe(generation)
        expect(frames.sent).toHaveLength(0)
      }).pipe(Effect.provide(openTabLayer(store, frames)))
    }),
  )

  it.effect("adds no tab when the panel has no provider", () =>
    Effect.gen(function* () {
      const store = yield* Ref.make(readyStore())
      const frames: InMemoryFrameMessaging = {
        replies: new Map(),
        sent: [],
        locations: new Map([["panel-2", threadHref]]),
      }
      yield* Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Storage | Tabs | Messaging>()
        const vm = createPanelGridViewModel(
          (effect) => {
            Runtime.runSync(runtime)(effect)
          },
          { layoutId: defaultLayoutId },
          () => [panelTwoHello],
        )
        expect(vm.panels().every((panel) => panel.providerId === null)).toBe(
          true,
        )
        yield* vm.openPanelInTab("panel-1")
        const state = yield* Ref.get(store)
        expect(state.rows).toHaveLength(0)
      }).pipe(
        Effect.provide(
          openTabLayer(store, frames, {
            [workspaceSettingsStorageKey]: {
              enabledProviders: [],
              layout: "1x3",
            },
          }),
        ),
      )
    }),
  )
})
