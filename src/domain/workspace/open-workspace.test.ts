import { Effect, Ref } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  inMemoryTabsLayer,
  type TabsMemoryState,
} from "../ports/in-memory-tabs"
import { openWorkspace } from "./open-workspace"

const workspaceUrl = "chrome-extension://test/workspace.html"

const emptyStore: TabsMemoryState = {
  rows: [],
  lastFocusedId: 0,
  nextId: 1,
}

describe("openWorkspace", () => {
  it.effect("empty store creates one tab and focuses it", () =>
    Effect.gen(function* () {
      const store = yield* Ref.make(emptyStore)
      const result = yield* openWorkspace(workspaceUrl).pipe(
        Effect.provide(inMemoryTabsLayer(store)),
      )
      const state = yield* Ref.get(store)
      expect(state.rows).toHaveLength(1)
      expect(state.rows.map((row) => row.id)).toEqual([result.id])
      expect(state.lastFocusedId).toBe(result.id)
    }),
  )

  it.effect("matching row focuses without creating a second", () =>
    Effect.gen(function* () {
      const store = yield* Ref.make<TabsMemoryState>({
        rows: [{ id: 7, windowId: 1, url: workspaceUrl }],
        lastFocusedId: 0,
        nextId: 99,
      })
      const result = yield* openWorkspace(workspaceUrl).pipe(
        Effect.provide(inMemoryTabsLayer(store)),
      )
      const state = yield* Ref.get(store)
      expect(state.rows).toHaveLength(1)
      expect(result.id).toBe(7)
      expect(state.lastFocusedId).toBe(7)
      expect(state.nextId).toBe(99)
    }),
  )

  it.effect("two matches focuses the first id", () =>
    Effect.gen(function* () {
      const store = yield* Ref.make<TabsMemoryState>({
        rows: [
          { id: 3, windowId: 1, url: workspaceUrl },
          { id: 8, windowId: 2, url: workspaceUrl },
        ],
        lastFocusedId: 0,
        nextId: 10,
      })
      const result = yield* openWorkspace(workspaceUrl).pipe(
        Effect.provide(inMemoryTabsLayer(store)),
      )
      const state = yield* Ref.get(store)
      expect(result.id).toBe(3)
      expect(state.rows).toHaveLength(2)
      expect(state.lastFocusedId).toBe(3)
    }),
  )
})
