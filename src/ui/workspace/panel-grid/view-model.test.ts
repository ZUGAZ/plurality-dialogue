import { Effect, Layer, Runtime } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  FramingRulesReady,
  FramingSessionRulesUpdateFailed,
} from "@domain/messaging/ensure-framing-rules"
import { inMemoryMessagingLayer } from "@domain/ports/in-memory-messaging"
import { inMemoryStorageLayer } from "@domain/ports/in-memory-storage"
import { inMemoryTabsLayer } from "@domain/ports/in-memory-tabs"
import { Messaging } from "@domain/ports/messaging"
import { Storage } from "@domain/ports/storage"
import { Tabs } from "@domain/ports/tabs"
import { builtInProviders } from "@domain/provider/built-in-providers"
import { workspaceSettingsStorageKey } from "@domain/settings/workspace-settings"
import { createPanelGridViewModel } from "./view-model"

const readyLayer = Layer.mergeAll(
  inMemoryStorageLayer(),
  inMemoryTabsLayer(1),
  inMemoryMessagingLayer(() => Effect.succeed(FramingRulesReady.make({}))),
)

const failedLayer = Layer.mergeAll(
  inMemoryStorageLayer(),
  inMemoryTabsLayer(1),
  inMemoryMessagingLayer(() =>
    Effect.succeed(FramingSessionRulesUpdateFailed.make({})),
  ),
)

const twoEnabledLayer = Layer.mergeAll(
  inMemoryStorageLayer({
    [workspaceSettingsStorageKey]: {
      enabledProviders: ["chatgpt", "claude"],
      layout: "1x3",
    },
  }),
  inMemoryTabsLayer(1),
  inMemoryMessagingLayer(() => Effect.succeed(FramingRulesReady.make({}))),
)

const zeroEnabledLayer = Layer.mergeAll(
  inMemoryStorageLayer({
    [workspaceSettingsStorageKey]: {
      enabledProviders: [],
      layout: "1x3",
    },
  }),
  inMemoryTabsLayer(1),
  inMemoryMessagingLayer(() => Effect.succeed(FramingRulesReady.make({}))),
)

const chatgptUrl = builtInProviders.find(
  (provider) => provider.id === "chatgpt",
)?.url
const claudeUrl = builtInProviders.find(
  (provider) => provider.id === "claude",
)?.url
const geminiUrl = builtInProviders.find(
  (provider) => provider.id === "gemini",
)?.url

describe("panel grid view-model", () => {
  it.layer(readyLayer)("ready handshake", (it) => {
    it.effect("sets three https srcs", () =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Storage | Tabs | Messaging>()
        const vm = createPanelGridViewModel((effect) => {
          Runtime.runSync(runtime)(effect)
        })
        const panels = vm.panels()
        expect(panels.map((panel) => panel.id)).toEqual([
          "panel-1",
          "panel-2",
          "panel-3",
        ])
        expect(panels).toHaveLength(3)
        for (const panel of panels) {
          expect(panel.src).toBeDefined()
          expect(panel.src?.startsWith("https://")).toBe(true)
        }
        expect(panels[0]?.src).toBe(chatgptUrl)
        expect(panels[1]?.src).toBe(claudeUrl)
        expect(panels[2]?.src).toBe(geminiUrl)
      }),
    )

    it.effect("setPanelProvider changes only panel-2", () =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Storage | Tabs | Messaging>()
        const vm = createPanelGridViewModel((effect) => {
          Runtime.runSync(runtime)(effect)
        })
        yield* vm.setPanelProvider("panel-2", "chatgpt")
        const panels = vm.panels()
        expect(panels.map((panel) => panel.providerId)).toEqual([
          "chatgpt",
          "chatgpt",
          "gemini",
        ])
        expect(panels[0]?.reloadGeneration).toBe(0)
        expect(panels[1]?.reloadGeneration).toBe(1)
        expect(panels[2]?.reloadGeneration).toBe(0)
        expect(panels[1]?.src).toBe(chatgptUrl)
        expect(panels[0]?.src).toBe(chatgptUrl)
        expect(panels[2]?.src).toBe(geminiUrl)
        expect(panels[1]?.hasLoaded).toBe(false)
      }),
    )

    it.effect("setPanelProvider is a no-op for the current id", () =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Storage | Tabs | Messaging>()
        const vm = createPanelGridViewModel((effect) => {
          Runtime.runSync(runtime)(effect)
        })
        yield* vm.setPanelProvider("panel-1", "chatgpt")
        const panels = vm.panels()
        expect(panels[0]?.providerId).toBe("chatgpt")
        expect(panels[0]?.reloadGeneration).toBe(0)
      }),
    )

    it.effect("setPanelProvider ignores grok and unknown ids", () =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Storage | Tabs | Messaging>()
        const vm = createPanelGridViewModel((effect) => {
          Runtime.runSync(runtime)(effect)
        })
        yield* vm.setPanelProvider("panel-1", "grok")
        yield* vm.setPanelProvider("panel-1", "unknown")
        const panels = vm.panels()
        expect(panels.map((panel) => panel.providerId)).toEqual([
          "chatgpt",
          "claude",
          "gemini",
        ])
        expect(panels.every((panel) => panel.reloadGeneration === 0)).toBe(true)
      }),
    )

    it.effect("refreshPanel bumps only panel-1", () =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Storage | Tabs | Messaging>()
        const vm = createPanelGridViewModel((effect) => {
          Runtime.runSync(runtime)(effect)
        })
        vm.onPanelLoad("panel-1")
        expect(vm.panels()[0]?.hasLoaded).toBe(true)
        yield* vm.refreshPanel("panel-1")
        const panels = vm.panels()
        expect(panels[0]?.reloadGeneration).toBe(1)
        expect(panels[1]?.reloadGeneration).toBe(0)
        expect(panels[2]?.reloadGeneration).toBe(0)
        expect(panels[0]?.providerId).toBe("chatgpt")
        expect(panels[0]?.src).toBe(chatgptUrl)
        expect(panels[0]?.hasLoaded).toBe(false)
      }),
    )
  })

  it.layer(failedLayer)("failed handshake", (it) => {
    it.effect("leaves every src undefined", () =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Storage | Tabs | Messaging>()
        const vm = createPanelGridViewModel((effect) => {
          Runtime.runSync(runtime)(effect)
        })
        const panels = vm.panels()
        expect(panels).toHaveLength(3)
        expect(panels.every((panel) => panel.src === undefined)).toBe(true)
        expect(panels.every((panel) => panel.failed)).toBe(true)
      }),
    )
  })

  it.layer(twoEnabledLayer)("shrinking enabled ids", (it) => {
    it.effect("reconciles three slots without disabled vendors", () =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Storage | Tabs | Messaging>()
        const vm = createPanelGridViewModel((effect) => {
          Runtime.runSync(runtime)(effect)
        })
        const panels = vm.panels()
        expect(panels.map((panel) => panel.providerId)).toEqual([
          "chatgpt",
          "claude",
          "chatgpt",
        ])
        expect(panels[0]?.reloadGeneration).toBe(0)
        expect(panels[1]?.reloadGeneration).toBe(0)
        expect(panels[2]?.reloadGeneration).toBe(1)
        expect(panels.some((panel) => panel.providerId === "gemini")).toBe(false)
        expect(vm.options().map((option) => option.id)).toEqual([
          "chatgpt",
          "claude",
        ])
        expect(panels[2]?.src).toBe(chatgptUrl)
      }),
    )
  })

  it.layer(zeroEnabledLayer)("zero enabled ids", (it) => {
    it.effect("clears src and treats refresh as a no-op", () =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Storage | Tabs | Messaging>()
        const vm = createPanelGridViewModel((effect) => {
          Runtime.runSync(runtime)(effect)
        })
        const panels = vm.panels()
        expect(panels.every((panel) => panel.providerId === null)).toBe(true)
        expect(panels.every((panel) => panel.src === undefined)).toBe(true)
        expect(vm.options()).toEqual([])
        const generation = panels[0]?.reloadGeneration
        yield* vm.refreshPanel("panel-1")
        expect(vm.panels()[0]?.reloadGeneration).toBe(generation)
      }),
    )
  })
})
