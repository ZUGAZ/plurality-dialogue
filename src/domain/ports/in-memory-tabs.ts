import { Array, Effect, Either, Layer, Option, Ref, pipe } from "effect"
import { parseWorkspaceTabId } from "../workspace/framing-session-rules"
import { OpenTab, TabFocusFailed, Tabs } from "./tabs"

export type TabsMemoryRow = {
  readonly id: number
  readonly windowId: number
  readonly url: string
}

export type TabsMemoryState = {
  readonly rows: readonly TabsMemoryRow[]
  readonly lastFocusedId: number
  readonly nextId: number
}

const inMemoryWindowId = 1

const parsedTabId = (id: number) =>
  pipe(
    parseWorkspaceTabId(id),
    Either.match({
      onLeft: (error) => Effect.fail(error),
      onRight: (parsed) => Effect.succeed(parsed),
    }),
  )

const makeTabs = (
  store: Ref.Ref<TabsMemoryState>,
  fixedCurrentId: Option.Option<number>,
) => ({
  currentTabId: () =>
    Option.match(fixedCurrentId, {
      onNone: () =>
        Ref.get(store).pipe(
          Effect.flatMap((state) => parsedTabId(state.lastFocusedId)),
        ),
      onSome: (id) => parsedTabId(id),
    }),
  queryByUrl: (url: string) =>
    Ref.get(store).pipe(
      Effect.map((state) =>
        state.rows
          .filter((row) => row.url === url)
          .map((row) =>
            OpenTab.make({ id: row.id, windowId: row.windowId }),
          ),
      ),
    ),
  create: (url: string) =>
    Ref.modify(store, (state): [OpenTab, TabsMemoryState] => {
      const created = OpenTab.make({
        id: state.nextId,
        windowId: inMemoryWindowId,
      })
      return [
        created,
        {
          rows: [
            ...state.rows,
            { id: created.id, windowId: created.windowId, url },
          ],
          lastFocusedId: created.id,
          nextId: state.nextId + 1,
        },
      ]
    }),
  focus: (tab: OpenTab) =>
    Ref.get(store).pipe(
      Effect.flatMap((state) =>
        pipe(
          Array.findFirst(state.rows, (row) => row.id === tab.id),
          Option.match({
            onNone: () =>
              Effect.fail(new TabFocusFailed({ message: "Tab not found" })),
            onSome: () =>
              Ref.update(store, (current) => ({
                ...current,
                lastFocusedId: tab.id,
              })),
          }),
        ),
      ),
    ),
})

const inMemoryTabsForCurrentId = (currentId: number): Layer.Layer<Tabs> =>
  Layer.effect(
    Tabs,
    Effect.map(
      Ref.make<TabsMemoryState>({
        rows: [],
        lastFocusedId: currentId,
        nextId: currentId + 1,
      }),
      (store) => makeTabs(store, Option.some(currentId)),
    ),
  )

export function inMemoryTabsLayer(currentId: number): Layer.Layer<Tabs>
export function inMemoryTabsLayer(
  store: Ref.Ref<TabsMemoryState>,
): Layer.Layer<Tabs>
export function inMemoryTabsLayer(
  storeOrCurrentId: number | Ref.Ref<TabsMemoryState>,
): Layer.Layer<Tabs> {
  if (typeof storeOrCurrentId === "number") {
    return inMemoryTabsForCurrentId(storeOrCurrentId)
  }
  return Layer.succeed(Tabs, makeTabs(storeOrCurrentId, Option.none()))
}
