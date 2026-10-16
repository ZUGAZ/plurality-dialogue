import { embeddableHosts, optionalHosts } from "./framing-policy"

export const ruleIdStride = embeddableHosts.length + 1

const optionalRuleIdCeiling = 2_147_483_640

const maxOptionalTabSlot = Math.floor(
  Math.floor(optionalRuleIdCeiling / ruleIdStride) / optionalHosts.length,
)

export const optionalFramingRuleId = (
  tabId: number,
  optionalIndex: number,
): number =>
  ((tabId % maxOptionalTabSlot) * optionalHosts.length + optionalIndex + 1) *
  ruleIdStride
