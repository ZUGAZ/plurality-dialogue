import { Effect, Either, Option, Schema } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { inMemoryStorageLayer } from "../ports/in-memory-storage"
import { Storage } from "../ports/storage"
import { workspaceSettingsStorageKey } from "../settings/workspace-settings"
import { loadWorkspaceSettings } from "../settings/workspace-settings-storage"
import {
  PanelRoleIndexOutOfRange,
  assignPanelRole,
  loadPanelInstruction,
  persistPanelRoles,
} from "./assign-panel-role"
import { roleCatalogStorageKey } from "./role"

const isRecord = Schema.is(
  Schema.Record({ key: Schema.String, value: Schema.Unknown }),
)

const seededSettings = {
  enabledProviders: ["chatgpt", "claude"],
  layout: "1x2",
  panelProviders: ["chatgpt", "claude"],
}

const seededCatalog = {
  roles: [{ id: "skeptic", name: "Skeptic", instruction: "Doubt it." }],
}

const seeded = {
  [workspaceSettingsStorageKey]: seededSettings,
  [roleCatalogStorageKey]: seededCatalog,
}

describe("assignPanelRole", () => {
  it.layer(inMemoryStorageLayer(seeded))("assign and clear", (it) => {
    it.effect("persists panelRoles and leaves the other fields", () =>
      Effect.gen(function* () {
        yield* assignPanelRole(0, "skeptic")
        const settings = yield* loadWorkspaceSettings()
        expect(settings.panelRoles).toEqual(["skeptic"])
        expect(settings.panelProviders).toEqual(["chatgpt", "claude"])
        expect(settings.layout).toBe("1x2")
        expect(settings.enabledProviders).toEqual(["chatgpt", "claude"])
      }),
    )

    it.effect("clears an index with null", () =>
      Effect.gen(function* () {
        yield* assignPanelRole(0, null)
        const settings = yield* loadWorkspaceSettings()
        expect(settings.panelRoles).toEqual([null])
      }),
    )
  })

  it.layer(inMemoryStorageLayer(seeded))("padding", (it) => {
    it.effect("pads holes with null on an absent field", () =>
      Effect.gen(function* () {
        yield* assignPanelRole(2, "skeptic")
        const settings = yield* loadWorkspaceSettings()
        expect(settings.panelRoles).toEqual([null, null, "skeptic"])
      }),
    )
  })

  it.layer(inMemoryStorageLayer(seeded))("index past the layout", (it) => {
    it.effect("persists and pads without a maximum", () =>
      Effect.gen(function* () {
        yield* assignPanelRole(4, "skeptic")
        expect((yield* loadWorkspaceSettings()).panelRoles).toEqual([
          null,
          null,
          null,
          null,
          "skeptic",
        ])
        yield* assignPanelRole(9, "skeptic")
        expect((yield* loadWorkspaceSettings()).panelRoles).toHaveLength(10)
      }),
    )
  })

  it.layer(inMemoryStorageLayer(seeded))("id missing from the catalog", (it) => {
    it.effect("still persists", () =>
      Effect.gen(function* () {
        yield* assignPanelRole(1, "ghost")
        const settings = yield* loadWorkspaceSettings()
        expect(settings.panelRoles).toEqual([null, "ghost"])
      }),
    )
  })

  const badIndexes = [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]
  for (const panelIndex of badIndexes) {
    it.layer(inMemoryStorageLayer(seeded))(`index ${panelIndex}`, (it) => {
      it.effect("fails PanelRoleIndexOutOfRange without writing", () =>
        Effect.gen(function* () {
          const storage = yield* Storage
          const before = yield* storage.get(workspaceSettingsStorageKey)
          const outcome = yield* Effect.either(
            assignPanelRole(panelIndex, "skeptic"),
          )
          expect(Either.isLeft(outcome)).toBe(true)
          if (Either.isLeft(outcome)) {
            expect(outcome.left).toBeInstanceOf(PanelRoleIndexOutOfRange)
          }
          expect(yield* storage.get(workspaceSettingsStorageKey)).toEqual(
            before,
          )
        }),
      )
    })
  }

  it.layer(inMemoryStorageLayer(seeded))("blank role id", (it) => {
    it.effect("fails and does not write", () =>
      Effect.gen(function* () {
        const storage = yield* Storage
        const before = yield* storage.get(workspaceSettingsStorageKey)
        const outcome = yield* Effect.either(assignPanelRole(0, "  "))
        expect(Either.isLeft(outcome)).toBe(true)
        if (Either.isLeft(outcome)) {
          expect(outcome.left._tag).toBe("ParseError")
        }
        expect(yield* storage.get(workspaceSettingsStorageKey)).toEqual(before)
      }),
    )
  })
})

describe("persistPanelRoles", () => {
  it.layer(inMemoryStorageLayer(seeded))("strict validation", (it) => {
    it.effect("fails ParseError on a blank id and does not write", () =>
      Effect.gen(function* () {
        const storage = yield* Storage
        const before = yield* storage.get(workspaceSettingsStorageKey)
        const outcome = yield* Effect.either(persistPanelRoles([""]))
        expect(Either.isLeft(outcome)).toBe(true)
        expect(yield* storage.get(workspaceSettingsStorageKey)).toEqual(before)
      }),
    )

    it.effect("persists a long array of valid ids", () =>
      Effect.gen(function* () {
        const sevenIds = ["a", "b", "c", "d", "e", "f", "g"]
        yield* persistPanelRoles(sevenIds)
        expect((yield* loadWorkspaceSettings()).panelRoles).toEqual(sevenIds)
      }),
    )
  })

  it.layer(inMemoryStorageLayer(seeded))("clearing", (it) => {
    it.effect("omits the key instead of storing undefined", () =>
      Effect.gen(function* () {
        const storage = yield* Storage
        yield* persistPanelRoles(["skeptic"])
        yield* persistPanelRoles(undefined)
        const stored = yield* storage.get(workspaceSettingsStorageKey)
        expect(Option.isSome(stored)).toBe(true)
        if (Option.isSome(stored) && isRecord(stored.value)) {
          expect(Object.hasOwn(stored.value, "panelRoles")).toBe(false)
        }
        expect((yield* loadWorkspaceSettings()).panelRoles).toBeUndefined()
      }),
    )
  })
})

describe("loadPanelInstruction", () => {
  it.layer(
    inMemoryStorageLayer({
      ...seeded,
      [workspaceSettingsStorageKey]: {
        ...seededSettings,
        panelRoles: ["skeptic", "ghost", null],
      },
    }),
  )("assigned panels", (it) => {
    it.effect("returns the catalog instruction when the id matches", () =>
      Effect.gen(function* () {
        expect(yield* loadPanelInstruction(0)).toEqual(
          Option.some("Doubt it."),
        )
      }),
    )

    it.effect("is none for an unknown id, a null slot, or out of range", () =>
      Effect.gen(function* () {
        expect(yield* loadPanelInstruction(1)).toEqual(Option.none())
        expect(yield* loadPanelInstruction(2)).toEqual(Option.none())
        expect(yield* loadPanelInstruction(99)).toEqual(Option.none())
        expect(yield* loadPanelInstruction(-1)).toEqual(Option.none())
      }),
    )
  })

  it.layer(
    inMemoryStorageLayer({
      [workspaceSettingsStorageKey]: {
        ...seededSettings,
        panelRoles: ["skeptic"],
      },
    }),
  )("catalog missing", (it) => {
    it.effect("is none", () =>
      Effect.gen(function* () {
        expect(yield* loadPanelInstruction(0)).toEqual(Option.none())
      }),
    )
  })

  it.layer(inMemoryStorageLayer(seeded))("no assignments", (it) => {
    it.effect("is none when panelRoles is absent", () =>
      Effect.gen(function* () {
        expect(yield* loadPanelInstruction(0)).toEqual(Option.none())
      }),
    )
  })
})
