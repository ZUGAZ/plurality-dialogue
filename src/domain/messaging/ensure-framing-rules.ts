import { Schema } from "effect"

export const EnsureFramingRulesRequest = Schema.TaggedStruct(
  "EnsureFramingRules",
  {},
)

export type EnsureFramingRulesRequest = typeof EnsureFramingRulesRequest.Type

export const isEnsureFramingRulesRequest = Schema.is(EnsureFramingRulesRequest)

export const FramingRulesReady = Schema.TaggedStruct("FramingRulesReady", {})

export type FramingRulesReady = typeof FramingRulesReady.Type

export const isFramingRulesReady = Schema.is(FramingRulesReady)

export const FramingTabIdUnavailable = Schema.TaggedStruct(
  "FramingTabIdUnavailable",
  {},
)

export type FramingTabIdUnavailable = typeof FramingTabIdUnavailable.Type

export const isFramingTabIdUnavailable = Schema.is(FramingTabIdUnavailable)

export const FramingSessionRulesUpdateFailed = Schema.TaggedStruct(
  "FramingSessionRulesUpdateFailed",
  {},
)

export type FramingSessionRulesUpdateFailed =
  typeof FramingSessionRulesUpdateFailed.Type

export const isFramingSessionRulesUpdateFailed = Schema.is(
  FramingSessionRulesUpdateFailed,
)

export const FramingRulesResponse = Schema.Union(
  FramingRulesReady,
  FramingTabIdUnavailable,
  FramingSessionRulesUpdateFailed,
)

export type FramingRulesResponse = typeof FramingRulesResponse.Type

export const isFramingRulesResponse = Schema.is(FramingRulesResponse)
