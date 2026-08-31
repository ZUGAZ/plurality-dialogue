import { Schema } from "effect"

export const WorkspacePingRequest = Schema.TaggedStruct("WorkspacePing", {})

export type WorkspacePingRequest = typeof WorkspacePingRequest.Type

export const WorkspacePingResponse = Schema.TaggedStruct("WorkspacePong", {})

export type WorkspacePingResponse = typeof WorkspacePingResponse.Type

export const isWorkspacePingRequest = Schema.is(WorkspacePingRequest)

export const isWorkspacePingResponse = Schema.is(WorkspacePingResponse)
