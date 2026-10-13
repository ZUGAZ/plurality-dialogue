export const temporaryChatClaimKey = (
  panelId: string,
  reloadGeneration: number,
  frameId: number,
): string => `${panelId}:${reloadGeneration}:${frameId}`

export const dropClaimedPanels = (
  claimed: ReadonlySet<string>,
  panelIds: readonly string[],
): ReadonlySet<string> => {
  if (panelIds.length === 0) {
    return claimed
  }
  const prefixes = panelIds.map((panelId) => `${panelId}:`)
  const next = new Set<string>()
  for (const key of claimed) {
    if (!prefixes.some((prefix) => key.startsWith(prefix))) {
      next.add(key)
    }
  }
  return next
}

export const planTemporaryChatEntry = <
  Frame extends {
    readonly panelId: string
    readonly frameId: number
  },
>(input: {
  readonly enabled: boolean
  readonly claimed: ReadonlySet<string>
  readonly frames: readonly Frame[]
  readonly panels: readonly {
    readonly id: string
    readonly reloadGeneration: number
  }[]
}): {
  readonly targets: readonly Frame[]
  readonly claimed: ReadonlySet<string>
} => {
  if (!input.enabled) {
    return { targets: [], claimed: input.claimed }
  }
  const panelsById = new Map(input.panels.map((panel) => [panel.id, panel]))
  const claimed = new Set(input.claimed)
  const targets: Frame[] = []
  for (const frame of input.frames) {
    const panel = panelsById.get(frame.panelId)
    if (panel === undefined) {
      continue
    }
    const key = temporaryChatClaimKey(
      panel.id,
      panel.reloadGeneration,
      frame.frameId,
    )
    if (claimed.has(key)) {
      continue
    }
    claimed.add(key)
    targets.push(frame)
  }
  return { targets, claimed }
}
