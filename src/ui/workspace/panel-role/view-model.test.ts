import { Effect, Layer, Option, Runtime } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { createRoot } from "solid-js"
import { inMemoryStorageLayer } from "@domain/ports/in-memory-storage"
import {
  Storage,
  StorageReadError,
  StorageWriteError,
} from "@domain/ports/storage"
import { builtInRoles } from "@domain/role/built-in-roles"
import { roleCatalogStorageKey } from "@domain/role/role"
import { workspaceSettingsStorageKey } from "@domain/settings/workspace-settings"
import { silentLoggerLayer } from "@test-support/silent-logger"
import {
  couldNotLoadRolesText,
  couldNotSaveText,
  duplicateRoleText,
  emptyFieldsText,
  roleGoneText,
} from "./model"
import {
  createPanelRoleViewModel,
  type PanelRoleViewModel,
} from "./view-model"

const freshLayer = Layer.mergeAll(inMemoryStorageLayer(), silentLoggerLayer)

const openSession = Effect.gen(function* () {
  const runtime = yield* Effect.runtime<Storage>()
  return createRoot((dispose) => ({
    vm: createPanelRoleViewModel(
      (effect) => {
        Runtime.runSync(runtime)(effect)
      },
      { panelRoles: undefined },
    ),
    dispose,
  }))
})

const runVm = <Failure>(
  check: (vm: PanelRoleViewModel) => Effect.Effect<void, Failure, Storage>,
) =>
  Effect.gen(function* () {
    const session = yield* openSession
    yield* check(session.vm)
    session.dispose()
  })

const storedRoleCatalog = Effect.gen(function* () {
  const storage = yield* Storage
  return yield* storage.get(roleCatalogStorageKey)
})

const hasRolesArray = (
  value: unknown,
): value is { readonly roles: readonly unknown[] } =>
  typeof value === "object" &&
  value !== null &&
  "roles" in value &&
  Array.isArray(value.roles)

const failingReadLayer = Layer.mergeAll(
  Layer.succeed(Storage, {
    get: () =>
      Effect.fail(
        new StorageReadError({ key: roleCatalogStorageKey, cause: "fail" }),
      ),
    set: () => {
      throw new Error("set must not be called on a failing read")
    },
  }),
  silentLoggerLayer,
)

const assignFailLayer = (() => {
  const base = inMemoryStorageLayer()
  return Layer.mergeAll(
    Layer.effect(
      Storage,
      Effect.gen(function* () {
        const inner = yield* Storage
        return {
          get: inner.get,
          set: (key: string, value: unknown) => {
            if (key === workspaceSettingsStorageKey) {
              return Effect.fail(
                new StorageWriteError({ key, cause: "denied" }),
              )
            }
            return inner.set(key, value)
          },
        }
      }).pipe(Effect.provide(base)),
    ),
    silentLoggerLayer,
  )
})()

describe("panel role view-model", () => {
  it.effect("empty store: seed fills catalog with builtInRoles", () =>
    runVm((vm) =>
      Effect.sync(() => {
        expect(vm.catalog()).toEqual(builtInRoles)
        expect(vm.catalog()).toEqual(builtInRoles)
      }),
    ).pipe(Effect.provide(freshLayer)),
  )

  it.effect("assignRole persists and updates panelRoles", () =>
    runVm((vm) =>
      Effect.gen(function* () {
        yield* vm.assignRole(1, "steelman")
        expect(vm.panelRoles()).toEqual([null, "steelman"])
        expect(vm.catalog()).toEqual(builtInRoles)
      }),
    ).pipe(Effect.provide(freshLayer)),
  )

  it.effect("assignRole with empty string writes null", () =>
    runVm((vm) =>
      Effect.gen(function* () {
        yield* vm.assignRole(1, "steelman")
        yield* vm.assignRole(1, "")
        expect(vm.panelRoles()).toEqual([null, null])
      }),
    ).pipe(Effect.provide(freshLayer)),
  )

  it.effect("save create appends role and assigns to slot", () =>
    runVm((vm) =>
      Effect.gen(function* () {
        vm.openCreate(1)
        vm.setName("Reviewer")
        vm.setInstruction("Review carefully.")
        yield* vm.save()
        expect(vm.catalog()?.map((r) => r.id)).toContain("reviewer")
        expect(vm.panelRoles()).toEqual([null, "reviewer"])
        expect(vm.form().open).toBe(false)
      }),
    ).pipe(Effect.provide(freshLayer)),
  )

  it.effect("duplicate name shows error and does not mint another id", () =>
    runVm((vm) =>
      Effect.gen(function* () {
        vm.openCreate(0)
        vm.setName("Skeptic")
        vm.setInstruction("Be skeptical.")
        yield* vm.save()
        expect(vm.actionError()).toBe(duplicateRoleText)
        expect(vm.form().open).toBe(true)
        const stored = yield* storedRoleCatalog
        expect(Option.isSome(stored)).toBe(true)
        if (Option.isSome(stored) && hasRolesArray(stored.value)) {
          expect(stored.value.roles).toHaveLength(builtInRoles.length)
        }
      }),
    ).pipe(Effect.provide(freshLayer)),
  )

  it.effect("empty name sets validation error and does not write past seed", () =>
    runVm((vm) =>
      Effect.gen(function* () {
        vm.openCreate(0)
        vm.setName("!!!")
        vm.setInstruction("some instruction")
        yield* vm.save()
        expect(vm.actionError()).toBe(emptyFieldsText)

        vm.setName("Valid Name")
        vm.setInstruction("")
        yield* vm.save()
        expect(vm.actionError()).toBe(emptyFieldsText)

        const stored = yield* storedRoleCatalog
        expect(Option.isSome(stored)).toBe(true)
        if (Option.isSome(stored) && hasRolesArray(stored.value)) {
          expect(stored.value.roles).toHaveLength(builtInRoles.length)
        }
      }),
    ).pipe(Effect.provide(freshLayer)),
  )

  it.effect("update changes name and instruction, keeps id, does not change panelRoles", () =>
    runVm((vm) =>
      Effect.gen(function* () {
        yield* vm.assignRole(0, "skeptic")
        vm.openEdit(0, "skeptic")
        vm.setName("Big Skeptic")
        vm.setInstruction("Question everything.")
        yield* vm.save()
        const updated = vm.catalog()?.find((r) => r.id === "skeptic")
        expect(updated?.name).toBe("Big Skeptic")
        expect(updated?.instruction).toBe("Question everything.")
        expect(vm.panelRoles()).toEqual(["skeptic"])
      }),
    ).pipe(Effect.provide(freshLayer)),
  )

  it.effect("delete removes row, leaves panelRoles with stored assignment, closes form", () =>
    runVm((vm) =>
      Effect.gen(function* () {
        yield* vm.assignRole(1, "steelman")
        vm.openEdit(1, "steelman")
        yield* vm.remove()
        expect(vm.catalog()?.map((r) => r.id)).not.toContain("steelman")
        expect(vm.panelRoles()?.[1]).toBe("steelman")
        expect(vm.form().open).toBe(false)
      }),
    ).pipe(Effect.provide(freshLayer)),
  )

  it.effect("delete all rows leaves empty catalog and does not seed again", () =>
    runVm((vm) =>
      Effect.gen(function* () {
        for (const role of builtInRoles) {
          vm.openEdit(0, role.id)
          yield* vm.remove()
        }
        expect(vm.catalog()).toEqual([])
      }),
    ).pipe(Effect.provide(freshLayer)),
  )

  it.effect("StorageReadError sets load error, leaves catalog undefined, set is not called", () =>
    Effect.gen(function* () {
      const runtime = yield* Effect.runtime<Storage>()
      const vm = createRoot((dispose) => {
        const created = createPanelRoleViewModel(
          (effect) => {
            Runtime.runSync(runtime)(effect)
          },
          { panelRoles: undefined },
        )
        return { ...created, dispose }
      })
      expect(vm.loadError()).toBe(couldNotLoadRolesText)
      expect(vm.catalog()).toBeUndefined()
      expect(vm.rolesReady()).toBe(false)
      vm.dispose()
    }).pipe(Effect.provide(failingReadLayer)),
  )

  it.effect("when load fails, save and assignRole do not write", () =>
    Effect.gen(function* () {
      const runtime = yield* Effect.runtime<Storage>()
      const vm = createRoot((dispose) => {
        const created = createPanelRoleViewModel(
          (effect) => {
            Runtime.runSync(runtime)(effect)
          },
          { panelRoles: undefined },
        )
        return { ...created, dispose }
      })
      yield* vm.assignRole(0, "skeptic")
      expect(vm.panelRoles()).toBeUndefined()
      vm.openCreate(0)
      expect(vm.form().open).toBe(false)
      vm.dispose()
    }).pipe(Effect.provide(failingReadLayer)),
  )

  it.effect("RoleNotFound replaces catalog from readRoleCatalogForWrite", () =>
    runVm((vm) =>
      Effect.gen(function* () {
        vm.openEdit(0, "skeptic")

        const storage = yield* Storage
        yield* storage.set(roleCatalogStorageKey, {
          roles: builtInRoles.filter(
            (role) => role.id === "steelman" || role.id === "implementer",
          ),
        })

        yield* vm.save()

        expect(vm.actionError()).toBe(roleGoneText)
        expect(vm.catalog()?.map((r) => r.id)).toEqual([
          "steelman",
          "implementer",
        ])
      }),
    ).pipe(Effect.provide(freshLayer)),
  )

  it.effect("create succeeds, assign fails: catalog has role, panelRoles unchanged, form stays open", () =>
    Effect.gen(function* () {
      const runtime = yield* Effect.runtime<Storage>()
      const vm = createRoot((dispose) => {
        const created = createPanelRoleViewModel(
          (effect) => {
            Runtime.runSync(runtime)(effect)
          },
          { panelRoles: undefined },
        )
        return { ...created, dispose }
      })
      vm.openCreate(1)
      vm.setName("Custom Role")
      vm.setInstruction("Do something custom.")
      yield* vm.save()
      expect(vm.catalog()?.map((r) => r.id)).toContain("custom-role")
      expect(vm.panelRoles()).toBeUndefined()
      expect(vm.form().open).toBe(true)
      expect(vm.actionError()).toBe(couldNotSaveText)
      vm.dispose()
    }).pipe(Effect.provide(assignFailLayer)),
  )
})
