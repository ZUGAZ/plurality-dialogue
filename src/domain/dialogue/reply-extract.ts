import { Option } from "effect"

const fencedBody = /```(?:json)?[ \t]*\r?\n?([\s\S]*?)```/i

const fromFence = (raw: string): Option.Option<string> =>
  Option.fromNullable(fencedBody.exec(raw)?.[1]).pipe(
    Option.map((body) => body.trim()),
  )

const fromOuterBraces = (raw: string): Option.Option<string> => {
  const first = raw.indexOf("{")
  const last = raw.lastIndexOf("}")
  return first === -1 || last < first
    ? Option.none()
    : Option.some(raw.slice(first, last + 1))
}

// No brace balancing: the candidate goes to JSON.parse, which decides.
export const extractJsonObject = (raw: string): Option.Option<string> => {
  const trimmed = raw.trim()
  if (trimmed.startsWith("{")) {
    return Option.some(trimmed)
  }
  return fromFence(trimmed).pipe(
    Option.orElse(() => fromOuterBraces(trimmed)),
  )
}
