import { Effect, Layer, Option, Ref } from "effect"
import { describe, expect, it } from "@effect/vitest"
import type { PanelTarget } from "../broadcast/panel-target"
import {
  inMemoryMessagingLayer,
  type InMemoryFrameMessaging,
} from "../ports/in-memory-messaging"
import {
  inMemoryTabsLayer,
  type TabsMemoryState,
} from "../ports/in-memory-tabs"
import { builtInProviders } from "../provider/built-in-providers"
import type { ProviderId } from "../provider/provider-id"
import {
  chooseProviderTabUrl,
  openProviderTab,
} from "./open-provider-tab"

const freshStore = (): TabsMemoryState => ({
  rows: [],
  lastFocusedId: 0,
  nextId: 1,
})

const hello = (
  providerId: ProviderId,
  panelId = "panel-1",
): PanelTarget => ({
  panelId,
  providerId,
  tabId: 1,
  frameId: 0,
})

const located = (panelId: string, href: string): InMemoryFrameMessaging => ({
  replies: new Map(),
  sent: [],
  locations: new Map([[panelId, href]]),
})

const providePorts = (
  store: Ref.Ref<TabsMemoryState>,
  frames?: InMemoryFrameMessaging,
) =>
  Layer.mergeAll(
    inMemoryTabsLayer(store),
    inMemoryMessagingLayer(() => Effect.succeed({}), frames),
  )

const definitionFor = (id: ProviderId) => {
  const found = builtInProviders.find((row) => row.id === id)
  if (found === undefined) {
    throw new Error("missing built-in provider")
  }
  return found
}

const threadHrefs: readonly {
  readonly id: ProviderId
  readonly href: string
}[] = [
  {
    id: "chatgpt",
    href: "https://chatgpt.com/c/00000000-0000-4000-8000-000000000001?model=gpt#reply",
  },
  {
    id: "claude",
    href: "https://claude.ai/chat/00000000-0000-4000-8000-000000000002",
  },
  {
    id: "gemini",
    href: "https://gemini.google.com/app/00000000-0000-4000-8000-000000000003",
  },
]

const rejectedHrefs = [
  "http://chatgpt.com/c/x",
  "https://chatgpt.com.evil.example/c/x",
  "https://evil.example/c/x",
  "not a url",
  "",
]

describe("openProviderTab", () => {
  it.effect("opens each catalog url when no frame has announced", () =>
    Effect.gen(function* () {
      for (const definition of builtInProviders) {
        const store = yield* Ref.make(freshStore())
        const chosen = yield* openProviderTab({
          providerId: definition.id,
          assignedSrc: undefined,
          frame: Option.none(),
        }).pipe(Effect.provide(providePorts(store)))
        const state = yield* Ref.get(store)
        expect(state.rows).toHaveLength(1)
        expect(state.rows[0]?.url).toBe(definition.url)
        expect(Option.getOrUndefined(chosen)).toBe(definition.url)
      }
    }),
  )

  it.effect("keeps the reported thread href for that catalog row", () =>
    Effect.gen(function* () {
      for (const thread of threadHrefs) {
        const store = yield* Ref.make(freshStore())
        const frames = located("panel-1", thread.href)
        yield* openProviderTab({
          providerId: thread.id,
          assignedSrc: definitionFor(thread.id).url,
          frame: Option.some(hello(thread.id)),
        }).pipe(Effect.provide(providePorts(store, frames)))
        const state = yield* Ref.get(store)
        expect(state.rows).toHaveLength(1)
        expect(state.rows[0]?.url).toBe(thread.href)
        expect(frames.sent).toHaveLength(0)
      }
    }),
  )

  it.effect("opens the chatgpt catalog url when the report is on another host", () =>
    Effect.gen(function* () {
      const store = yield* Ref.make(freshStore())
      const foreign = "https://claude.ai/chat/x"
      yield* openProviderTab({
        providerId: "chatgpt",
        assignedSrc: undefined,
        frame: Option.some(hello("chatgpt")),
      }).pipe(Effect.provide(providePorts(store, located("panel-1", foreign))))
      const state = yield* Ref.get(store)
      expect(state.rows).toHaveLength(1)
      expect(state.rows[0]?.url).toBe(definitionFor("chatgpt").url)
      expect(state.rows[0]?.url).not.toBe(foreign)
    }),
  )

  it.effect("falls back when the reported href fails the host check", () =>
    Effect.gen(function* () {
      const catalog = definitionFor("chatgpt").url
      for (const href of rejectedHrefs) {
        const store = yield* Ref.make(freshStore())
        yield* openProviderTab({
          providerId: "chatgpt",
          assignedSrc: undefined,
          frame: Option.some(hello("chatgpt")),
        }).pipe(Effect.provide(providePorts(store, located("panel-1", href))))
        const state = yield* Ref.get(store)
        expect(state.rows).toHaveLength(1)
        expect(state.rows[0]?.url).toBe(catalog)
        expect(state.rows[0]?.url).not.toBe(href)
      }
    }),
  )

  it.effect("uses assigned src when the report is missing or rejected", () =>
    Effect.gen(function* () {
      const assigned = "https://chatgpt.com/c/assigned"
      const missing = yield* Ref.make(freshStore())
      yield* openProviderTab({
        providerId: "chatgpt",
        assignedSrc: assigned,
        frame: Option.none(),
      }).pipe(Effect.provide(providePorts(missing)))
      expect((yield* Ref.get(missing)).rows[0]?.url).toBe(assigned)

      const rejected = yield* Ref.make(freshStore())
      yield* openProviderTab({
        providerId: "chatgpt",
        assignedSrc: assigned,
        frame: Option.some(hello("chatgpt")),
      }).pipe(
        Effect.provide(
          providePorts(rejected, located("panel-1", "http://chatgpt.com/c/x")),
        ),
      )
      const rejectedState = yield* Ref.get(rejected)
      expect(rejectedState.rows).toHaveLength(1)
      expect(rejectedState.rows[0]?.url).toBe(assigned)

      const badAssigned = yield* Ref.make(freshStore())
      yield* openProviderTab({
        providerId: "chatgpt",
        assignedSrc: "https://evil.example/assigned",
        frame: Option.none(),
      }).pipe(Effect.provide(providePorts(badAssigned)))
      expect((yield* Ref.get(badAssigned)).rows[0]?.url).toBe(
        definitionFor("chatgpt").url,
      )
    }),
  )

  it.effect("uses the catalog url when assigned src is withheld", () =>
    Effect.gen(function* () {
      const store = yield* Ref.make(freshStore())
      yield* openProviderTab({
        providerId: "claude",
        assignedSrc: undefined,
        frame: Option.none(),
      }).pipe(Effect.provide(providePorts(store)))
      const state = yield* Ref.get(store)
      expect(state.rows).toHaveLength(1)
      expect(state.rows[0]?.url).toBe(definitionFor("claude").url)
    }),
  )

  it.effect("opens assigned src when the frame location faults", () =>
    Effect.gen(function* () {
      const store = yield* Ref.make(freshStore())
      const frames: InMemoryFrameMessaging = {
        replies: new Map(),
        sent: [],
      }
      const assigned = "https://claude.ai/chat/from-src"
      yield* openProviderTab({
        providerId: "claude",
        assignedSrc: assigned,
        frame: Option.some(hello("claude")),
      }).pipe(Effect.provide(providePorts(store, frames)))
      const state = yield* Ref.get(store)
      expect(state.rows).toHaveLength(1)
      expect(state.rows[0]?.url).toBe(assigned)
      expect(frames.sent).toHaveLength(0)
    }),
  )

  it("rejects a catalog url whose hostname is not the given host", () => {
    expect(
      chooseProviderTabUrl({
        host: "not-a-catalog-host.example",
        catalogUrl: definitionFor("chatgpt").url,
        assignedSrc: "https://chatgpt.com/c/assigned",
        reportedHref: "https://chatgpt.com/c/reported",
      }),
    ).toBeUndefined()
  })

  it.effect("two opens create two tabs", () =>
    Effect.gen(function* () {
      const store = yield* Ref.make(freshStore())
      const definition = definitionFor("gemini")
      const input = {
        providerId: definition.id,
        assignedSrc: undefined,
        frame: Option.none(),
      }
      yield* openProviderTab(input).pipe(Effect.provide(providePorts(store)))
      yield* openProviderTab(input).pipe(Effect.provide(providePorts(store)))
      const state = yield* Ref.get(store)
      expect(state.rows).toHaveLength(2)
      expect(state.rows.map((row) => row.url)).toEqual([
        definition.url,
        definition.url,
      ])
    }),
  )
})
