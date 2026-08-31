import { Either, Option, Schema } from "effect"
import type { ProviderId } from "../provider/provider-id"

export const LayoutId = Schema.Union(
  Schema.Literal("1x1"),
  Schema.Literal("1x2"),
  Schema.Literal("1x3"),
  Schema.Literal("2x2"),
)

export type LayoutId = typeof LayoutId.Type

export const isLayoutId = Schema.is(LayoutId)

export const defaultLayoutId: LayoutId = "1x3"

const decodeLayoutId = Schema.decodeUnknownEither(LayoutId)

export const layoutIdOrDefault = (u: unknown): LayoutId =>
  decodeLayoutId(u).pipe(
    Either.match({
      onLeft: () => defaultLayoutId,
      onRight: (id) => id,
    }),
  )

export type LayoutGrid = {
  readonly id: LayoutId
  readonly columnCount: number
  readonly rowCount: number
}

export const cellCount = (preset: LayoutGrid): number =>
  preset.columnCount * preset.rowCount

const layout1x1: LayoutGrid = { id: "1x1", columnCount: 1, rowCount: 1 }
const layout1x2: LayoutGrid = { id: "1x2", columnCount: 2, rowCount: 1 }
const layout1x3: LayoutGrid = { id: "1x3", columnCount: 3, rowCount: 1 }
const layout2x2: LayoutGrid = { id: "2x2", columnCount: 2, rowCount: 2 }

export const layoutPresets: readonly [
  LayoutGrid,
  LayoutGrid,
  LayoutGrid,
  LayoutGrid,
] = [layout1x1, layout1x2, layout1x3, layout2x2]

const gridById: { readonly [Id in LayoutId]: LayoutGrid } = {
  "1x1": layout1x1,
  "1x2": layout1x2,
  "1x3": layout1x3,
  "2x2": layout2x2,
}

export const presetById = (id: LayoutId): LayoutGrid => gridById[id]

export const providerAt = (
  enabledIds: readonly ProviderId[],
  index: number,
): Option.Option<ProviderId> => {
  if (enabledIds.length === 0) {
    return Option.none()
  }
  const id = enabledIds[index % enabledIds.length]
  return id === undefined ? Option.none() : Option.some(id)
}
