import { Either } from "effect"
import {
  dnrUrlFilter,
  embeddableHosts,
  framingHeaderNames,
  framingResourceTypes,
} from "./framing-policy"
import { TabIdUnavailable } from "./tab-id-unavailable"

export type FramingRemovedHeader = {
  readonly header: (typeof framingHeaderNames)[number]
  readonly operation: "remove"
}

export type FramingSessionRuleSpec = {
  readonly id: number
  readonly priority: 1
  readonly action: {
    readonly type: "modifyHeaders"
    readonly responseHeaders: readonly FramingRemovedHeader[]
  }
  readonly condition: {
    readonly urlFilter: ReturnType<typeof dnrUrlFilter>
    readonly resourceTypes: typeof framingResourceTypes
    readonly tabIds: readonly number[]
  }
}

const signedIntegerMax = 2_147_483_647
const ruleIdStride = 4

// Chrome rule ids are signed 32-bit. tabId * stride overflows once the tab
// id passes ~5.3e8, and Chrome then rejects the whole updateSessionRules call.
const maxTabSlot = Math.floor(
  (signedIntegerMax - (ruleIdStride - 1)) / ruleIdStride,
)

export const framingRuleId = (tabId: number, hostIndex: number): number =>
  (tabId % maxTabSlot) * ruleIdStride + hostIndex + 1

const removedHeader = (
  header: (typeof framingHeaderNames)[number],
): FramingRemovedHeader => ({
  header,
  operation: "remove",
})

export const framingSessionRulesForTab = (
  tabId: number,
): readonly FramingSessionRuleSpec[] =>
  embeddableHosts.map((host, hostIndex): FramingSessionRuleSpec => ({
    id: framingRuleId(tabId, hostIndex),
    priority: 1,
    action: {
      type: "modifyHeaders",
      responseHeaders: framingHeaderNames.map(removedHeader),
    },
    condition: {
      urlFilter: dnrUrlFilter(host),
      resourceTypes: framingResourceTypes,
      tabIds: [tabId],
    },
  }))

export const framingRuleIdsForTab = (tabId: number): readonly number[] =>
  embeddableHosts.map((_, hostIndex) => framingRuleId(tabId, hostIndex))

export const parseWorkspaceTabId = (
  tabId: number | undefined,
): Either.Either<number, TabIdUnavailable> => {
  if (tabId === undefined) {
    return Either.left(new TabIdUnavailable())
  }
  if (!Number.isInteger(tabId) || tabId < 1) {
    return Either.left(new TabIdUnavailable())
  }
  return Either.right(tabId)
}

export const collectWorkspaceTabIds = (
  tabIds: readonly (number | undefined)[],
): readonly number[] => {
  const unique: number[] = []
  const seen = new Set<number>()
  for (const tabId of tabIds) {
    Either.match(parseWorkspaceTabId(tabId), {
      onLeft: () => undefined,
      onRight: (parsed) => {
        if (seen.has(parsed)) {
          return
        }
        seen.add(parsed)
        unique.push(parsed)
      },
    })
  }
  return unique
}

export const nonEmptyDocumentUrls = (
  urls: readonly (string | undefined)[],
): readonly string[] => {
  const unique: string[] = []
  const seen = new Set<string>()
  for (const url of urls) {
    if (url === undefined || url.length === 0 || seen.has(url)) {
      continue
    }
    seen.add(url)
    unique.push(url)
  }
  return unique
}

export const resolveFramingTabId = (
  senderTabId: number | undefined,
  requestedTabId: number | undefined,
): Either.Either<number, TabIdUnavailable> => {
  const first = collectWorkspaceTabIds([senderTabId, requestedTabId])[0]
  if (first === undefined) {
    return Either.left(new TabIdUnavailable())
  }
  return Either.right(first)
}
