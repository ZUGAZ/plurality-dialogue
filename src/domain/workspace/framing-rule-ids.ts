import {
  embeddableHosts,
  optionalHosts,
  websocketCookieHosts,
} from "./framing-policy"

// One id block per workspace tab. Inside a block: the embeddable hosts first,
// then the WebSocket cookie hosts; slot 0 (multiples of the stride) is left to
// the optional hosts, which use their own block arithmetic below.
export const ruleIdStride =
  embeddableHosts.length + websocketCookieHosts.length + 1

const signedIntegerMax = 2_147_483_647

// Chrome rule ids are signed 32-bit. tabId * stride overflows once the tab
// id passes ~4.3e8, and Chrome then rejects the whole updateSessionRules call.
const maxTabSlot = Math.floor(
  (signedIntegerMax - (ruleIdStride - 1)) / ruleIdStride,
)

const tabSlot = (tabId: number): number => (tabId % maxTabSlot) * ruleIdStride

export const framingRuleId = (tabId: number, hostIndex: number): number =>
  tabSlot(tabId) + hostIndex + 1

export const websocketCookieRuleId = (
  tabId: number,
  hostIndex: number,
): number => tabSlot(tabId) + embeddableHosts.length + hostIndex + 1

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
