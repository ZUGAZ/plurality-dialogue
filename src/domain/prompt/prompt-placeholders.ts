const placeholder = (): RegExp => /\{([A-Za-z_][A-Za-z0-9_]*)\}/g

const capturedName = (match: RegExpMatchArray): string | undefined => match[1]

export const listPlaceholders = (body: string): readonly string[] => {
  const names: string[] = []
  const seen = new Set<string>()
  for (const match of body.matchAll(placeholder())) {
    const name = capturedName(match)
    if (name === undefined || seen.has(name)) {
      continue
    }
    seen.add(name)
    names.push(name)
  }
  return names
}

export const substitutePlaceholders = (
  body: string,
  values: Readonly<Record<string, string>>,
): string => {
  let result = ""
  let cursor = 0
  for (const match of body.matchAll(placeholder())) {
    const name = capturedName(match)
    const start = match.index
    if (name === undefined || start === undefined) {
      continue
    }
    const replacement = values[name] ?? ""
    result = `${result}${body.slice(cursor, start)}${replacement}`
    cursor = start + match[0].length
  }
  return `${result}${body.slice(cursor)}`
}
