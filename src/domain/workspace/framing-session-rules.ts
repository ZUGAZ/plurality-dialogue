import { Either } from "effect"
import {
  embeddableHosts,
  framingHeaderNames,
  framingResourceTypes,
  hostPermissionPattern,
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
    readonly urlFilter: ReturnType<typeof hostPermissionPattern>
    readonly resourceTypes: typeof framingResourceTypes
    readonly tabIds: readonly number[]
  }
}

export const framingRuleId = (tabId: number, hostIndex: number): number =>
  tabId * 4 + hostIndex + 1

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
      urlFilter: hostPermissionPattern(host),
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
