import type { Prompt } from "./prompt"

export type PromptSort = "updated" | "recent" | "title"

export type PromptQuery = {
  readonly search?: string
  readonly tag?: string
  readonly favoritesOnly?: boolean
  readonly sort?: PromptSort
}

const compareId = (left: Prompt, right: Prompt): number => {
  if (left.id < right.id) {
    return -1
  }
  if (left.id > right.id) {
    return 1
  }
  return 0
}

const compareUpdated = (left: Prompt, right: Prompt): number => {
  if (left.updatedAt === right.updatedAt) {
    return compareId(left, right)
  }
  return right.updatedAt - left.updatedAt
}

const compareRecent = (left: Prompt, right: Prompt): number => {
  if (left.lastUsedAt === undefined && right.lastUsedAt === undefined) {
    return compareId(left, right)
  }
  if (left.lastUsedAt === undefined) {
    return 1
  }
  if (right.lastUsedAt === undefined) {
    return -1
  }
  if (left.lastUsedAt === right.lastUsedAt) {
    return compareId(left, right)
  }
  return right.lastUsedAt - left.lastUsedAt
}

const compareTitle = (left: Prompt, right: Prompt): number => {
  const leftTitle = left.title.toLowerCase()
  const rightTitle = right.title.toLowerCase()
  if (leftTitle === rightTitle) {
    return compareId(left, right)
  }
  if (leftTitle < rightTitle) {
    return -1
  }
  return 1
}

const compareBy = (
  sort: PromptSort,
): ((left: Prompt, right: Prompt) => number) => {
  if (sort === "recent") {
    return compareRecent
  }
  if (sort === "title") {
    return compareTitle
  }
  return compareUpdated
}

const folded = (value: string | undefined): string =>
  value === undefined ? "" : value.trim().toLowerCase()

const matchesQuery = (prompt: Prompt, query: PromptQuery): boolean => {
  const search = folded(query.search)
  if (
    search !== "" &&
    !prompt.title.toLowerCase().includes(search) &&
    !prompt.body.toLowerCase().includes(search)
  ) {
    return false
  }
  const tag = folded(query.tag)
  if (
    tag !== "" &&
    !prompt.tags.some((item) => item.toLowerCase() === tag)
  ) {
    return false
  }
  return query.favoritesOnly !== true || prompt.favorite
}

export const queryPrompts = (
  prompts: readonly Prompt[],
  query: PromptQuery,
): readonly Prompt[] => {
  const matched = prompts.filter((prompt) => matchesQuery(prompt, query))
  const ordered = [...matched]
  ordered.sort(compareBy(query.sort ?? "updated"))
  return ordered
}
