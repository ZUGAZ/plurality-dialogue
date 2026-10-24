import { Effect, Either, Layer, Option } from "effect"
import { ParseError } from "effect/ParseResult"
import { describe, expect, it } from "@effect/vitest"
import { inMemoryStorageLayer } from "../ports/in-memory-storage"
import { Storage, StorageReadError } from "../ports/storage"
import { workspaceSettingsStorageKey } from "../settings/workspace-settings"
import { builtInRoles } from "./built-in-roles"
import { roleCatalogStorageKey } from "./role"
import { DuplicateRoleId } from "./role-catalog-storage"
import { RoleNotFound, createRole, deleteRole, updateRole } from "./role-crud"
import { seedBuiltInRoles } from "./seed-built-in-roles"

const skeptic = { id: "skeptic", name: "Skeptic", instruction: "Doubt it." }
const steelman = { id: "steelman", name: "Steelman", instruction: "Defend." }
const implementer = { id: "implementer", name: "Doer", instruction: "Do." }
const reviewer = { id: "reviewer", name: "Reviewer", instruction: "Review." }
const settingsValue = { marker: "settings" }

const failingReadStorage = Layer.succeed(Storage, {
  get: () =>
    Effect.fail(
      new StorageReadError({ key: roleCatalogStorageKey, cause: "fail" }),
    ),
  set: () => Effect.die("set must not be called"),
})

const catalogLayer = (stored: unknown) =>
  inMemoryStorageLayer({
    [roleCatalogStorageKey]: stored,
    [workspaceSettingsStorageKey]: settingsValue,
  })

const storedCatalog = Effect.gen(function* () {
  const storage = yield* Storage
  return yield* storage.get(roleCatalogStorageKey)
})

const failsWith = <E>(
  program: Effect.Effect<unknown, E, Storage>,
  expected: abstract new (...args: never[]) => unknown,
) =>
  Effect.gen(function* () {
    const result = yield* Effect.either(program)
    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(expected)
    }
  })

describe("createRole", () => {
  it.layer(catalogLayer({ roles: [skeptic] }))("one stored row", (it) => {
    it.effect("trims, appends, returns the role, ignores extra keys", () =>
      Effect.gen(function* () {
        const created = yield* createRole({
          id: "  reviewer  ",
          name: "  Reviewer  ",
          instruction: "  Review.  ",
          builtin: true,
        })
        expect(created).toEqual(reviewer)
        expect(yield* storedCatalog).toEqual(
          Option.some({ roles: [skeptic, reviewer] }),
        )
        const storage = yield* Storage
        expect(yield* storage.get(workspaceSettingsStorageKey)).toEqual(
          Option.some(settingsValue),
        )
      }),
    )
  })

  it.layer(inMemoryStorageLayer())("empty catalog", (it) => {
    it.effect("stores only the new role", () =>
      Effect.gen(function* () {
        yield* createRole(reviewer)
        expect(yield* storedCatalog).toEqual(Option.some({ roles: [reviewer] }))
      }),
    )
  })

  const stored = { roles: [skeptic] }
  it.layer(catalogLayer(stored))("duplicate id", (it) => {
    it.effect("fails DuplicateRoleId and leaves storage", () =>
      Effect.gen(function* () {
        const result = yield* Effect.either(
          createRole({ ...reviewer, id: " skeptic " }),
        )
        expect(Either.isLeft(result)).toBe(true)
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(DuplicateRoleId)
          expect(result.left).toMatchObject({ id: "skeptic" })
        }
        expect(yield* storedCatalog).toEqual(Option.some(stored))
      }),
    )
  })

  it.layer(catalogLayer(stored))("blank fields", (it) => {
    it.effect("fails ParseError and does not write", () =>
      Effect.gen(function* () {
        yield* failsWith(createRole({ ...reviewer, name: "  " }), ParseError)
        yield* failsWith(createRole({ ...reviewer, id: "" }), ParseError)
        yield* failsWith(
          createRole({ ...reviewer, instruction: " " }),
          ParseError,
        )
        expect(yield* storedCatalog).toEqual(Option.some(stored))
      }),
    )
  })

  const withDuplicate = {
    roles: [skeptic, { ...skeptic, instruction: "Later duplicate." }],
  }
  it.layer(catalogLayer(withDuplicate))("duplicate stored ids", (it) => {
    it.effect("stores the first-wins rows plus the new role", () =>
      Effect.gen(function* () {
        yield* createRole(reviewer)
        expect(yield* storedCatalog).toEqual(
          Option.some({ roles: [skeptic, reviewer] }),
        )
      }),
    )
  })

  it.effect("fails StorageReadError when get fails", () =>
    failsWith(createRole(reviewer), StorageReadError).pipe(
      Effect.provide(failingReadStorage),
    ),
  )
})

describe("updateRole", () => {
  const stored = { roles: [skeptic, steelman] }

  it.layer(catalogLayer(stored))("known id", (it) => {
    it.effect("changes name and instruction, keeps id and position", () =>
      Effect.gen(function* () {
        const updated = yield* updateRole("  skeptic  ", {
          name: "  Doubter  ",
          instruction: "  Doubt harder.  ",
        })
        const expected = {
          id: "skeptic",
          name: "Doubter",
          instruction: "Doubt harder.",
        }
        expect(updated).toEqual(expected)
        expect(yield* storedCatalog).toEqual(
          Option.some({ roles: [expected, steelman] }),
        )
      }),
    )
  })

  it.layer(catalogLayer(stored))("patch with an id", (it) => {
    it.effect("does not retarget the row", () =>
      Effect.gen(function* () {
        yield* updateRole("skeptic", {
          id: "steelman",
          name: "Doubter",
          instruction: "Doubt harder.",
        })
        expect(yield* storedCatalog).toEqual(
          Option.some({
            roles: [
              { id: "skeptic", name: "Doubter", instruction: "Doubt harder." },
              steelman,
            ],
          }),
        )
      }),
    )
  })

  it.layer(catalogLayer(stored))("unknown id", (it) => {
    it.effect("fails RoleNotFound and does not write", () =>
      Effect.gen(function* () {
        yield* failsWith(
          updateRole("ghost", { name: "N", instruction: "I" }),
          RoleNotFound,
        )
        expect(yield* storedCatalog).toEqual(Option.some(stored))
      }),
    )
  })

  it.layer(catalogLayer(stored))("blank instruction", (it) => {
    it.effect("fails ParseError and does not write", () =>
      Effect.gen(function* () {
        yield* failsWith(
          updateRole("skeptic", { name: "N", instruction: "  " }),
          ParseError,
        )
        yield* failsWith(
          updateRole(" ", { name: "N", instruction: "I" }),
          ParseError,
        )
        expect(yield* storedCatalog).toEqual(Option.some(stored))
      }),
    )
  })

  it.effect("fails StorageReadError when get fails", () =>
    failsWith(
      updateRole("skeptic", { name: "N", instruction: "I" }),
      StorageReadError,
    ).pipe(Effect.provide(failingReadStorage)),
  )
})

describe("deleteRole", () => {
  it.layer(catalogLayer({ roles: [skeptic, steelman, implementer] }))(
    "middle id",
    (it) => {
      it.effect("keeps the other rows in order", () =>
        Effect.gen(function* () {
          yield* deleteRole(" steelman ")
          expect(yield* storedCatalog).toEqual(
            Option.some({ roles: [skeptic, implementer] }),
          )
        }),
      )
    },
  )

  it.layer(catalogLayer({ roles: [skeptic] }))("last row", (it) => {
    it.effect("persists an empty catalog and keeps the key", () =>
      Effect.gen(function* () {
        yield* deleteRole("skeptic")
        expect(yield* storedCatalog).toEqual(Option.some({ roles: [] }))
      }),
    )
  })

  const stored = { roles: [skeptic] }
  it.layer(catalogLayer(stored))("unknown id", (it) => {
    it.effect("fails RoleNotFound and does not write", () =>
      Effect.gen(function* () {
        yield* failsWith(deleteRole("ghost"), RoleNotFound)
        yield* failsWith(deleteRole(" "), ParseError)
        expect(yield* storedCatalog).toEqual(Option.some(stored))
      }),
    )
  })

  it.layer(catalogLayer({ roles: [skeptic, steelman] }))(
    "delete one built-in, then seed",
    (it) => {
      it.effect("keeps it deleted", () =>
        Effect.gen(function* () {
          yield* deleteRole("skeptic")
          yield* seedBuiltInRoles()
          expect(yield* storedCatalog).toEqual(
            Option.some({ roles: [steelman] }),
          )
        }),
      )
    },
  )

  it.layer(catalogLayer({ roles: [skeptic, steelman] }))(
    "delete every row, then seed",
    (it) => {
      it.effect("restores the factory rows", () =>
        Effect.gen(function* () {
          yield* deleteRole("skeptic")
          yield* deleteRole("steelman")
          yield* seedBuiltInRoles()
          expect(yield* storedCatalog).toEqual(
            Option.some({ roles: builtInRoles }),
          )
        }),
      )
    },
  )

  it.effect("fails StorageReadError when get fails", () =>
    failsWith(deleteRole("skeptic"), StorageReadError).pipe(
      Effect.provide(failingReadStorage),
    ),
  )
})
