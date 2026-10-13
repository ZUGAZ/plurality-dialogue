import { Effect } from "effect"
import type { PanelTarget } from "@domain/broadcast/panel-target"
import { requestTemporaryChat } from "@domain/broadcast/request-temporary-chat"
import type { Messaging } from "@domain/ports/messaging"
import {
  dropClaimedPanels,
  planTemporaryChatEntry,
} from "./temporary-chat-plan"

export type TemporaryChatWireHost = {
  readonly temporaryChat: () => boolean
  readonly applyTemporaryChat: (enabled: boolean) => readonly string[]
  readonly panels: () => readonly {
    readonly id: string
    readonly reloadGeneration: number
  }[]
  readonly frames: () => readonly PanelTarget[]
  readonly forgetFrames: (panelIds: readonly string[]) => void
  readonly clearStatus: () => void
  readonly run: (effect: Effect.Effect<unknown, never, Messaging>) => void
}

export const wireTemporaryChat = (host: TemporaryChatWireHost) => {
  let claimed: ReadonlySet<string> = new Set()

  const onToggle = (): void => {
    const next = !host.temporaryChat()
    const remounted = host.applyTemporaryChat(next)
    host.forgetFrames(remounted)
    claimed = dropClaimedPanels(claimed, remounted)
    host.run(
      Effect.log("temporary chat", next).pipe(
        Effect.withLogSpan("temporaryChat"),
      ),
    )
    if (!next) {
      host.clearStatus()
      return
    }
    const plan = planTemporaryChatEntry({
      enabled: true,
      claimed,
      frames: host.frames(),
      panels: host.panels(),
    })
    claimed = plan.claimed
    host.run(requestTemporaryChat(plan.targets))
  }

  const onFrameHello = (hello: PanelTarget): void => {
    const plan = planTemporaryChatEntry({
      enabled: host.temporaryChat(),
      claimed,
      frames: [hello],
      panels: host.panels(),
    })
    claimed = plan.claimed
    if (plan.targets.length === 0) {
      return
    }
    host.run(requestTemporaryChat(plan.targets))
  }

  return { onToggle, onFrameHello }
}
