import { Effect, Either, Layer, Option } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { inMemoryStorageLayer } from "../ports/in-memory-storage"
import { Storage, StorageReadError } from "../ports/storage"
import { emptyRoleCatalog, roleCatalogStorageKey } from "./role"
import { readRoleCatalogForWrite } from "./read-role-catalog"

const skeptic = { id: "skeptic", name: "Skeptic", instruction: "Doubt it." }

const failingReadStorage = Layer.succeed(Storage, {
  get: () =>
    Effect.fail(
      new StorageReadError({ key: roleCatalogStorageKey, cause: "fail" }),
    ),
  set: () => Effect.die("set must not be called"),
})

describe("readRoleCatalogForWrite", () => {
  it.layer(inMemoryStorageLayer())("missing key", (it) => {
    it.effect("returns the empty catalog and does not write", () =>
      Effect.gen(function* () {
        const storage = yield* Storage
        expect(yield* readRoleCatalogForWrite()).toEqual(emptyRoleCatalog)
        expect(yield* storage.get(roleCatalogStorageKey)).toEqual(
          Option.none(),
        )
      }),
    )
  })

  const emptyStored = { roles: [] }
  it.layer(inMemoryStorageLayer({ [roleCatalogStorageKey]: emptyStored }))(
    "stored empty catalog",
    (it) => {
      it.effect("returns empty and does not write", () =>
        Effect.gen(function* () {
          const storage = yield* Storage
          expect(yield* readRoleCatalogForWrite()).toEqual(emptyRoleCatalog)
          expect(yield* storage.get(roleCatalogStorageKey)).toEqual(
            Option.some(emptyStored),
          )
        }),
      )
    },
  )

  it.layer(inMemoryStorageLayer({ [roleCatalogStorageKey]: "nope" }))(
    "non-object value",
    (it) => {
      it.effect("returns empty and does not write", () =>
        Effect.gen(function* () {
          const storage = yield* Storage
          expect(yield* readRoleCatalogForWrite()).toEqual(emptyRoleCatalog)
          expect(yield* storage.get(roleCatalogStorageKey)).toEqual(
            Option.some("nope"),
          )
        }),
      )
    },
  )

  const withBadRow = { roles: [skeptic, { id: "" }] }
  it.layer(inMemoryStorageLayer({ [roleCatalogStorageKey]: withBadRow }))(
    "one corrupt row",
    (it) => {
      it.effect("returns the valid role and leaves the stored value", () =>
        Effect.gen(function* () {
          const storage = yield* Storage
          expect(yield* readRoleCatalogForWrite()).toEqual({ roles: [skeptic] })
          expect(yield* storage.get(roleCatalogStorageKey)).toEqual(
            Option.some(withBadRow),
          )
        }),
      )
    },
  )

  const withDuplicate = {
    roles: [skeptic, { ...skeptic, instruction: "Later duplicate." }],
  }
  it.layer(inMemoryStorageLayer({ [roleCatalogStorageKey]: withDuplicate }))(
    "duplicate stored ids",
    (it) => {
      it.effect("returns the first only and leaves the stored value", () =>
        Effect.gen(function* () {
          const storage = yield* Storage
          expect(yield* readRoleCatalogForWrite()).toEqual({ roles: [skeptic] })
          expect(yield* storage.get(roleCatalogStorageKey)).toEqual(
            Option.some(withDuplicate),
          )
        }),
      )
    },
  )

  it.effect("fails StorageReadError when get fails and does not write", () =>
    Effect.gen(function* () {
      const result = yield* Effect.either(readRoleCatalogForWrite())
      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(StorageReadError)
      }
    }).pipe(Effect.provide(failingReadStorage)),
  )
})
