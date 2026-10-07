import { describe, expect, it } from "@effect/vitest"
import type { Prompt } from "./prompt"
import { queryPrompts } from "./prompt-query"

const prompt = (
  id: string,
  title: string,
  fields: {
    readonly body?: string
    readonly tags?: readonly string[]
    readonly favorite?: boolean
    readonly updatedAt?: number
    readonly lastUsedAt?: number
  },
): Prompt => ({
  id,
  title,
  body: fields.body ?? "",
  tags: fields.tags ?? [],
  favorite: fields.favorite ?? false,
  createdAt: 1,
  updatedAt: fields.updatedAt ?? 0,
  ...(fields.lastUsedAt === undefined
    ? {}
    : { lastUsedAt: fields.lastUsedAt }),
})

const prompts: readonly Prompt[] = [
  prompt("b", "Beta", {
    body: "apples",
    tags: ["Work"],
    updatedAt: 20,
    lastUsedAt: 5,
  }),
  prompt("a", "alpha", {
    body: "Hello",
    tags: ["work", "home"],
    favorite: true,
    updatedAt: 10,
  }),
  prompt("c", "Gamma", {
    body: "other",
    favorite: true,
    updatedAt: 10,
    lastUsedAt: 9,
  }),
  prompt("d", "beta", {
    tags: ["Work"],
    updatedAt: 20,
    lastUsedAt: 5,
  }),
]

const ids = (listed: readonly Prompt[]) => listed.map((item) => item.id)

describe("queryPrompts", () => {
  it("applies no text filter for a blank search and defaults to updated order", () => {
    expect(ids(queryPrompts(prompts, { search: "   " }))).toEqual([
      "b",
      "d",
      "a",
      "c",
    ])
    expect(ids(queryPrompts(prompts, {}))).toEqual(["b", "d", "a", "c"])
  })

  it("matches title or body case-insensitively", () => {
    expect(ids(queryPrompts(prompts, { search: "HELLO" }))).toEqual(["a"])
    expect(ids(queryPrompts(prompts, { search: "GAMMA" }))).toEqual(["c"])
    expect(ids(queryPrompts(prompts, { search: "APP" }))).toEqual(["b"])
  })

  it("filters tags case-insensitively", () => {
    expect(ids(queryPrompts(prompts, { tag: "  WORK " }))).toEqual([
      "b",
      "d",
      "a",
    ])
  })

  it("keeps favorites when favoritesOnly is true", () => {
    expect(
      ids(queryPrompts(prompts, { favoritesOnly: true, sort: "title" })),
    ).toEqual(["a", "c"])
    expect(ids(queryPrompts(prompts, { favoritesOnly: false }))).toEqual([
      "b",
      "d",
      "a",
      "c",
    ])
  })

  it("sorts updated, recent, and title with id tie-breaks", () => {
    expect(ids(queryPrompts(prompts, { sort: "updated" }))).toEqual([
      "b",
      "d",
      "a",
      "c",
    ])
    expect(ids(queryPrompts(prompts, { sort: "recent" }))).toEqual([
      "c",
      "b",
      "d",
      "a",
    ])
    expect(ids(queryPrompts(prompts, { sort: "title" }))).toEqual([
      "a",
      "b",
      "d",
      "c",
    ])
  })
})
