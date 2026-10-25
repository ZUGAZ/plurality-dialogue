import { Effect, Either, Layer, Option } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { inMemoryStorageLayer } from "../ports/in-memory-storage"
import { Storage, StorageReadError } from "../ports/storage"
import { workspaceSettingsStorageKey } from "../settings/workspace-settings"
import { builtInRoles } from "./built-in-roles"
import { roleCatalogStorageKey, type Role } from "./role"
import {
  builtInRoleRevisionKey,
  seedBuiltInRoles,
} from "./seed-built-in-roles"

const skeptic = { id: "skeptic", name: "Skeptic", instruction: "Doubt it." }
const shippedSkeptic = {
  id: "skeptic",
  name: "Skeptic",
  instruction:
    "Question the claim: name the weakest assumption and what evidence would change the conclusion.",
}
const steelman = { id: "steelman", name: "Steelman", instruction: "Defend." }
const implementer = { id: "implementer", name: "Doer", instruction: "Do." }

const laterBuiltIns = (): readonly Role[] =>
  builtInRoles.filter(
    (role) =>
      role.id !== "skeptic" &&
      role.id !== "steelman" &&
      role.id !== "implementer",
  )
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

const adoptsLaterRoles = (
  name: string,
  stored: unknown,
  returned: readonly Role[],
) =>
  it.layer(
    inMemoryStorageLayer({
      [roleCatalogStorageKey]: stored,
      [workspaceSettingsStorageKey]: settingsValue,
    }),
  )(name, (it) => {
    it.effect("adds the new built-ins once and leaves settings alone", () =>
      Effect.gen(function* () {
        const storage = yield* Storage
        const expected = { roles: returned }
        expect(yield* seedBuiltInRoles()).toEqual(expected)
        expect(yield* storage.get(roleCatalogStorageKey)).toEqual(
          Option.some(expected),
        )
        expect(yield* storage.get(builtInRoleRevisionKey)).toEqual(
          Option.some(1),
        )
        expect(yield* seedBuiltInRoles()).toEqual(expected)
        expect(yield* storage.get(roleCatalogStorageKey)).toEqual(
          Option.some(expected),
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

  adoptsLaterRoles("one custom row", { roles: [skeptic] }, [
    skeptic,
    ...laterBuiltIns(),
  ])
  adoptsLaterRoles(
    "edited skeptic",
    { roles: [{ ...skeptic, instruction: "Edited." }] },
    [{ ...skeptic, instruction: "Edited." }, ...laterBuiltIns()],
  )
  adoptsLaterRoles(
    "shipped skeptic sentence",
    { roles: [shippedSkeptic, steelman] },
    [
      builtInRoles.find((role) => role.id === "skeptic") ?? shippedSkeptic,
      steelman,
      ...laterBuiltIns(),
    ],
  )
  adoptsLaterRoles(
    "no skeptic",
    { roles: [steelman, implementer] },
    [steelman, implementer, ...laterBuiltIns()],
  )
  adoptsLaterRoles(
    "bad element beside a valid row",
    { roles: [skeptic, { id: "" }] },
    [skeptic, ...laterBuiltIns()],
  )
  adoptsLaterRoles(
    "two rows sharing an id",
    { roles: [skeptic, { ...skeptic, instruction: "Later." }] },
    [skeptic, ...laterBuiltIns()],
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
