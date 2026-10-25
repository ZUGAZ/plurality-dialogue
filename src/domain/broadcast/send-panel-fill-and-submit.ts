import { Array, Effect, Option } from "effect"
import type { FillAndSubmit } from "./commands/fill-and-submit"
import type { ComposerEmpty } from "./errors"
import { executeBroadcastCommands } from "./execute-broadcast"
import { PanelFailed } from "./panel-failed"
import type { PanelResult } from "./panel-result"
import type { PanelTarget } from "./panel-target"
import { prepareSendCommand } from "./prepare-command"

// One panel, one FillAndSubmit, no images and no role prepend: the caller owns
// the whole text.
export const sendPanelFillAndSubmit = Effect.fn("sendPanelFillAndSubmit")(
  function* (target: PanelTarget, prompt: string) {
    const command = yield* commandFor(prompt)
    const results = yield* executeBroadcastCommands([{ target, command }])
    return Array.head(results).pipe(
      Option.getOrElse(
        (): PanelResult =>
          PanelFailed.make({
            panelId: target.panelId,
            providerId: target.providerId,
            reason: "messaging-failed",
          }),
      ),
    )
  },
)

const commandFor = (
  prompt: string,
): Effect.Effect<FillAndSubmit, ComposerEmpty> =>
  prepareSendCommand(prompt, []).pipe(
    // An empty image list is always valid, so this branch cannot happen.
    Effect.catchTag("BroadcastImagesInvalid", (error) => Effect.die(error)),
  )
