import { Effect, Either, Option } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { inMemoryStorageLayer } from "../ports/in-memory-storage"
import { Storage } from "../ports/storage"
import { emptyRoleCatalog, roleCatalogStorageKey } from "./role"
import {
  DuplicateRoleId,
  loadRoleCatalog,
  persistRoleCatalog,
} from "./role-catalog-storage"

const skeptic = { id: "skeptic", name: "Skeptic", instruction: "Doubt it." }

describe("role catalog storage", () => {
  it.layer(inMemoryStorageLayer())("missing key", (it) => {
    it.effect("loads the empty catalog and does not write", () =>
      Effect.gen(function* () {
        const storage = yield* Storage
        expect(yield* loadRoleCatalog()).toEqual(emptyRoleCatalog)
        expect(yield* storage.get(roleCatalogStorageKey)).toEqual(
          Option.none(),
        )
      }),
    )
  })

  const withBadRow = { roles: [skeptic, { id: "" }] }
  it.layer(inMemoryStorageLayer({ [roleCatalogStorageKey]: withBadRow }))(
    "one corrupt row",
    (it) => {
      it.effect("keeps the valid role and leaves the stored value", () =>
        Effect.gen(function* () {
          const storage = yield* Storage
          expect(yield* loadRoleCatalog()).toEqual({ roles: [skeptic] })
          expect(yield* storage.get(roleCatalogStorageKey)).toEqual(
            Option.some(withBadRow),
          )
        }),
      )
    },
  )

  it.layer(inMemoryStorageLayer({ [roleCatalogStorageKey]: "nope" }))(
    "non-object value",
    (it) => {
      it.effect("loads empty and does not write", () =>
        Effect.gen(function* () {
          const storage = yield* Storage
          expect(yield* loadRoleCatalog()).toEqual(emptyRoleCatalog)
          expect(yield* storage.get(roleCatalogStorageKey)).toEqual(
            Option.some("nope"),
          )
        }),
      )
    },
  )

  it.layer(inMemoryStorageLayer({ [roleCatalogStorageKey]: { roles: "x" } }))(
    "roles that is not an array",
    (it) => {
      it.effect("loads empty", () =>
        Effect.gen(function* () {
          expect(yield* loadRoleCatalog()).toEqual(emptyRoleCatalog)
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
      it.effect("loads the first only and leaves the stored value", () =>
        Effect.gen(function* () {
          const storage = yield* Storage
          expect(yield* loadRoleCatalog()).toEqual({ roles: [skeptic] })
          expect(yield* storage.get(roleCatalogStorageKey)).toEqual(
            Option.some(withDuplicate),
          )
        }),
      )
    },
  )

  it.layer(inMemoryStorageLayer())("persist", (it) => {
    it.effect("round-trips a catalog", () =>
      Effect.gen(function* () {
        const catalog = {
          roles: [skeptic, { id: "other", name: "Other", instruction: "Hm." }],
        }
        yield* persistRoleCatalog(catalog)
        expect(yield* loadRoleCatalog()).toEqual(catalog)
      }),
    )

    it.effect("fails DuplicateRoleId and keeps the previous value", () =>
      Effect.gen(function* () {
        const storage = yield* Storage
        yield* persistRoleCatalog({ roles: [skeptic] })
        const before = yield* storage.get(roleCatalogStorageKey)
        const outcome = yield* Effect.either(
          persistRoleCatalog({
            roles: [skeptic, { ...skeptic, name: "Again" }],
          }),
        )
        expect(Either.isLeft(outcome)).toBe(true)
        if (Either.isLeft(outcome)) {
          expect(outcome.left).toBeInstanceOf(DuplicateRoleId)
          expect(outcome.left).toMatchObject({ id: "skeptic" })
        }
        expect(yield* storage.get(roleCatalogStorageKey)).toEqual(before)
      }),
    )
  })
})
