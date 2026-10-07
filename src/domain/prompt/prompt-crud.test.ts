import { Effect, Layer, Option } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { inMemoryPromptLibraryLayer } from "../ports/in-memory-prompt-library"
import {
  PromptLibrary,
  PromptLibraryReadError,
  PromptLibraryWriteError,
} from "../ports/prompt-library"
import {
  PromptNotFound,
  createPrompt,
  deletePrompt,
  listPrompts,
  setPromptFavorite,
  touchPromptUsed,
  updatePrompt,
} from "./prompt-crud"

const patch = {
  title: "  Renamed  ",
  body: "Next body",
  tags: [" Z ", "z", "Keep"],
}

const waitPast = (instant: number) =>
  Effect.promise(
    () =>
      new Promise<void>((resolve) => {
        const started = Date.now()
        const check = () => {
          if (Date.now() > instant || Date.now() - started > 40) {
            resolve()
            return
          }
          setTimeout(check, 1)
        }
        check()
      }),
  )

const expectNotFound = (id: string) => (error: unknown) => {
  expect(error).toBeInstanceOf(PromptNotFound)
  if (error instanceof PromptNotFound) {
    expect(error.id).toBe(id)
  }
}

const unavailableLibrary = Layer.succeed(PromptLibrary, {
  getAll: () =>
    Effect.fail(new PromptLibraryReadError({ cause: "unavailable" })),
  get: () => Effect.fail(new PromptLibraryReadError({ cause: "unavailable" })),
  put: () =>
    Effect.fail(new PromptLibraryWriteError({ cause: "unavailable" })),
  delete: () =>
    Effect.fail(new PromptLibraryWriteError({ cause: "unavailable" })),
})

const kept = {
  id: "kept",
  title: "Kept",
  body: "still here",
  tags: ["a"],
  favorite: false,
  createdAt: 10,
  updatedAt: 11,
}

describe("prompt crud", () => {
  it.layer(inMemoryPromptLibraryLayer())("empty library", (it) => {
    it.effect("lists no prompts", () =>
      Effect.gen(function* () {
        expect(yield* listPrompts()).toEqual([])
      }),
    )
  })

  it.layer(inMemoryPromptLibraryLayer())("create", (it) => {
    it.effect(
      "assigns id and timestamps, favorite false, no lastUsedAt, and normalized tags",
      () =>
        Effect.gen(function* () {
          const before = Date.now()
          const created = yield* createPrompt({
            title: "  Title  ",
            body: "",
            tags: [" A ", "a", "", "B"],
          })
          const after = Date.now()
          const again = yield* createPrompt({ title: "Other", body: "x" })
          expect(created.id).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
          )
          expect(created.id).not.toBe(again.id)
          expect(created.createdAt).toBe(created.updatedAt)
          expect(created.createdAt).toBeGreaterThanOrEqual(before)
          expect(created.createdAt).toBeLessThanOrEqual(after)
          expect(created.favorite).toBe(false)
          expect(created.lastUsedAt).toBeUndefined()
          expect(Object.hasOwn(created, "lastUsedAt")).toBe(false)
          expect(created.title).toBe("Title")
          expect(created.tags).toEqual(["A", "B"])
          expect(yield* listPrompts()).toEqual([created, again])
        }),
    )
  })

  it.layer(inMemoryPromptLibraryLayer())("update", (it) => {
    it.effect(
      "replaces title, body, and tags, bumps updatedAt, and keeps favorite and lastUsedAt",
      () =>
        Effect.gen(function* () {
          const created = yield* createPrompt({
            title: "Original",
            body: "old",
            tags: ["old"],
          })
          yield* waitPast(created.updatedAt)
          const favorite = yield* setPromptFavorite(created.id, true)
          expect(favorite.favorite).toBe(true)
          expect(favorite.updatedAt).toBeGreaterThan(created.updatedAt)
          yield* waitPast(favorite.updatedAt)
          const touched = yield* touchPromptUsed(created.id)
          expect(touched.lastUsedAt).toBeGreaterThan(favorite.updatedAt)
          expect(touched.updatedAt).toBe(favorite.updatedAt)
          yield* waitPast(touched.updatedAt)
          const updated = yield* updatePrompt(created.id, patch)
          expect(updated.title).toBe("Renamed")
          expect(updated.body).toBe("Next body")
          expect(updated.tags).toEqual(["Z", "Keep"])
          expect(updated.favorite).toBe(true)
          expect(updated.lastUsedAt).toBe(touched.lastUsedAt)
          expect(updated.createdAt).toBe(created.createdAt)
          expect(updated.id).toBe(created.id)
          expect(updated.updatedAt).toBeGreaterThan(touched.updatedAt)
          expect(yield* listPrompts()).toEqual([updated])
        }),
    )
  })

  it.layer(inMemoryPromptLibraryLayer())("unknown id", (it) => {
    it.effect("fails update, delete, favorite, and touch with PromptNotFound", () =>
      Effect.gen(function* () {
        const id = "missing"
        expectNotFound(id)(yield* updatePrompt(id, patch).pipe(Effect.flip))
        expectNotFound(id)(yield* deletePrompt(id).pipe(Effect.flip))
        expectNotFound(id)(
          yield* setPromptFavorite(id, true).pipe(Effect.flip),
        )
        expectNotFound(id)(yield* touchPromptUsed(id).pipe(Effect.flip))
        expect(yield* listPrompts()).toEqual([])
      }),
    )
  })

  it.layer(inMemoryPromptLibraryLayer())("delete", (it) => {
    it.effect("removes the record", () =>
      Effect.gen(function* () {
        const first = yield* createPrompt({ title: "One", body: "" })
        const second = yield* createPrompt({ title: "Two", body: "" })
        yield* deletePrompt(first.id)
        const library = yield* PromptLibrary
        expect(yield* library.get(first.id)).toEqual(Option.none())
        expect(yield* listPrompts()).toEqual([second])
      }),
    )
  })

  it.layer(inMemoryPromptLibraryLayer())("favorite", (it) => {
    it.effect("persists setPromptFavorite(true)", () =>
      Effect.gen(function* () {
        const created = yield* createPrompt({ title: "Keep", body: "x" })
        yield* waitPast(created.updatedAt)
        const favorite = yield* setPromptFavorite(created.id, true)
        const listed = yield* listPrompts()
        expect(listed).toEqual([favorite])
        expect(favorite.favorite).toBe(true)
        expect(favorite.updatedAt).toBeGreaterThan(created.updatedAt)
        expect(favorite.createdAt).toBe(created.createdAt)
      }),
    )
  })

  it.layer(inMemoryPromptLibraryLayer())("touch", (it) => {
    it.effect("sets lastUsedAt and leaves updatedAt unchanged", () =>
      Effect.gen(function* () {
        const created = yield* createPrompt({ title: "Used", body: "x" })
        yield* waitPast(created.updatedAt)
        const touched = yield* touchPromptUsed(created.id)
        expect(touched.updatedAt).toBe(created.updatedAt)
        expect(touched.lastUsedAt).toBeGreaterThan(created.updatedAt)
        expect(yield* listPrompts()).toEqual([touched])
      }),
    )
  })

  it.layer(inMemoryPromptLibraryLayer([kept, { id: "corrupt", title: 12 }]))(
    "corrupt record",
    (it) => {
      it.effect(
        "omits the corrupt object and deletePrompt removes that key",
        () =>
          Effect.gen(function* () {
            const library = yield* PromptLibrary
            expect(yield* listPrompts()).toEqual([kept])
            expect(Option.isSome(yield* library.get("corrupt"))).toBe(true)
            expectNotFound("corrupt")(
              yield* updatePrompt("corrupt", patch).pipe(Effect.flip),
            )
            expect(Option.isSome(yield* library.get("corrupt"))).toBe(true)
            yield* deletePrompt("corrupt")
            expect(yield* library.get("corrupt")).toEqual(Option.none())
            expect(yield* listPrompts()).toEqual([kept])
          }),
      )
    },
  )

  it.layer(unavailableLibrary)("read failure", (it) => {
    it.effect("propagates PromptLibraryReadError instead of an empty list", () =>
      Effect.gen(function* () {
        const error = yield* listPrompts().pipe(Effect.flip)
        expect(error).toBeInstanceOf(PromptLibraryReadError)
      }),
    )
  })
})
