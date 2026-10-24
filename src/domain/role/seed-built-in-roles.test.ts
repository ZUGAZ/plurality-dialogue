import { Effect, Either, Layer, Option } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { inMemoryStorageLayer } from "../ports/in-memory-storage"
import { Storage, StorageReadError } from "../ports/storage"
import { workspaceSettingsStorageKey } from "../settings/workspace-settings"
import { builtInRoles } from "./built-in-roles"
import { roleCatalogStorageKey } from "./role"
import { seedBuiltInRoles } from "./seed-built-in-roles"

const skeptic = { id: "skeptic", name: "Skeptic", instruction: "Doubt it." }
const steelman = { id: "steelman", name: "Steelman", instruction: "Defend." }
const implementer = { id: "implementer", name: "Doer", instruction: "Do." }
const settingsValue = { marker: "settings" }

const failingReadStorage = Layer.succeed(Storage, {
  get: () =>
    Effect.fail(
      new StorageReadError({ key: roleCatalogStorageKey, cause: "fail" }),
    ),
  set: () => Effect.die("set must not be called"),
})

const seedsFactoryRows = (initial: Readonly<Record<string, unknown>>) =>
  it.layer(inMemoryStorageLayer(initial))("seeds the three rows", (it) => {
    it.effect("persists builtInRoles and a second seed keeps them", () =>
      Effect.gen(function* () {
        const storage = yield* Storage
        const expected = { roles: builtInRoles }
        expect(yield* seedBuiltInRoles()).toEqual(expected)
        expect(yield* storage.get(roleCatalogStorageKey)).toEqual(
          Option.some(expected),
        )
        expect(yield* seedBuiltInRoles()).toEqual(expected)
        expect(yield* storage.get(roleCatalogStorageKey)).toEqual(
          Option.some(expected),
        )
        expect(yield* storage.get(workspaceSettingsStorageKey)).toEqual(
          Option.fromNullable(initial[workspaceSettingsStorageKey]),
        )
      }),
    )
  })

const leavesStoredValue = (
  name: string,
  stored: unknown,
  returned: readonly unknown[],
) =>
  it.layer(
    inMemoryStorageLayer({
      [roleCatalogStorageKey]: stored,
      [workspaceSettingsStorageKey]: settingsValue,
    }),
  )(name, (it) => {
    it.effect("returns the decoded catalog and leaves storage alone", () =>
      Effect.gen(function* () {
        const storage = yield* Storage
        expect(yield* seedBuiltInRoles()).toEqual({ roles: returned })
        expect(yield* storage.get(roleCatalogStorageKey)).toEqual(
          Option.some(stored),
        )
        expect(yield* storage.get(workspaceSettingsStorageKey)).toEqual(
          Option.some(settingsValue),
        )
      }),
    )
  })

describe("seedBuiltInRoles", () => {
  seedsFactoryRows({ [workspaceSettingsStorageKey]: settingsValue })
  seedsFactoryRows({
    [roleCatalogStorageKey]: { roles: [] },
    [workspaceSettingsStorageKey]: settingsValue,
  })
  seedsFactoryRows({
    [roleCatalogStorageKey]: "nope",
    [workspaceSettingsStorageKey]: settingsValue,
  })

  leavesStoredValue("one custom row", { roles: [skeptic] }, [skeptic])
  leavesStoredValue(
    "edited skeptic",
    { roles: [{ ...skeptic, instruction: "Edited." }] },
    [{ ...skeptic, instruction: "Edited." }],
  )
  leavesStoredValue(
    "no skeptic",
    { roles: [steelman, implementer] },
    [steelman, implementer],
  )
  leavesStoredValue(
    "bad element beside a valid row",
    { roles: [skeptic, { id: "" }] },
    [skeptic],
  )
  leavesStoredValue(
    "two rows sharing an id",
    { roles: [skeptic, { ...skeptic, instruction: "Later." }] },
    [skeptic],
  )

  it.effect("fails StorageReadError when get fails and does not write", () =>
    Effect.gen(function* () {
      const result = yield* Effect.either(seedBuiltInRoles())
      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(StorageReadError)
      }
    }).pipe(Effect.provide(failingReadStorage)),
  )
})
