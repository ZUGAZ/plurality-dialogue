import type { ProviderId } from "../../domain/provider/provider-id"
import { optionalProviderIds } from "../../domain/provider/provider-id"
import {
  hostPermissionPattern,
  optionalHosts,
} from "../../domain/workspace/framing-policy"

const pageFileAssignProviderIds: ReadonlySet<ProviderId> = new Set([
  "qwen-global",
  "zhipu",
  "zai",
])

export const pageFileAssignScriptPath = "content-scripts/page-file-assign.js"

export const usesPageFileAssign = (id: ProviderId): boolean =>
  pageFileAssignProviderIds.has(id)

export const optionalOriginForId = (id: ProviderId): string | undefined => {
  const index = optionalProviderIds.indexOf(id)
  const host = optionalHosts[index]
  if (host === undefined) {
    return undefined
  }
  return hostPermissionPattern(host)
}

export const isolatedScriptPath = (id: ProviderId): string =>
  `content-scripts/${id}.js`

export const pageFileAssignScriptId = (id: ProviderId): string =>
  `page-file-assign-${id}`

export const scriptIdsForProvider = (id: ProviderId): readonly string[] =>
  usesPageFileAssign(id) ? [id, pageFileAssignScriptId(id)] : [id]
