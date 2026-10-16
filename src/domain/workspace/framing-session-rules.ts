import { Either } from "effect"
import { optionalProviderIds, type ProviderId } from "../provider/provider-id"
import {
  dnrUrlFilter,
  embeddableHosts,
  framingHeaderNames,
  framingResourceTypes,
  optionalHosts,
  type OptionalHost,
} from "./framing-policy"
import {
  optionalFramingRuleId,
  ruleIdStride,
} from "./optional-framing-rule-id"
import { TabIdUnavailable } from "./tab-id-unavailable"

export { ruleIdStride }

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

// Chrome rule ids are signed 32-bit. tabId * stride overflows once the tab
// id passes ~4.3e8, and Chrome then rejects the whole updateSessionRules call.
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

const framingSpec = (
  id: number,
  urlFilter: ReturnType<typeof dnrUrlFilter>,
  tabId: number,
): FramingSessionRuleSpec => ({
  id,
  priority: 1,
  action: {
    type: "modifyHeaders",
    responseHeaders: framingHeaderNames.map(removedHeader),
  },
  condition: {
    urlFilter,
    resourceTypes: framingResourceTypes,
    tabIds: [tabId],
  },
})

export const enabledOptionalHosts = (
  enabledIds: readonly ProviderId[],
): readonly OptionalHost[] => {
  const enabled = new Set(enabledIds)
  const hosts: OptionalHost[] = []
  for (let index = 0; index < optionalProviderIds.length; index += 1) {
    const id = optionalProviderIds[index]
    const host = optionalHosts[index]
    if (id === undefined || host === undefined || !enabled.has(id)) {
      continue
    }
    hosts.push(host)
  }
  return hosts
}

export const framingSessionRulesForTab = (
  tabId: number,
  enabledOptional: readonly OptionalHost[] = [],
): readonly FramingSessionRuleSpec[] => {
  const staticSpecs = embeddableHosts.map((host, hostIndex) =>
    framingSpec(framingRuleId(tabId, hostIndex), dnrUrlFilter(host), tabId),
  )
  const optionalSpecs: FramingSessionRuleSpec[] = []
  for (const host of enabledOptional) {
    const optionalIndex = optionalHosts.indexOf(host)
    if (optionalIndex < 0) {
      continue
    }
    optionalSpecs.push(
      framingSpec(
        optionalFramingRuleId(tabId, optionalIndex),
        dnrUrlFilter(host),
        tabId,
      ),
    )
  }
  return [...staticSpecs, ...optionalSpecs]
}

export const framingRuleIdsForTab = (tabId: number): readonly number[] => [
  ...embeddableHosts.map((_, hostIndex) => framingRuleId(tabId, hostIndex)),
  ...optionalHosts.map((_, optionalIndex) =>
    optionalFramingRuleId(tabId, optionalIndex),
  ),
]

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
