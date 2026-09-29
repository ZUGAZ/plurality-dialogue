import { Effect, ManagedRuntime } from "effect"
import { defineBackground } from "#imports"
import { openWorkspace } from "@domain/workspace/open-workspace"
import {
  openWorkspaceCommandName,
  workspacePagePath,
} from "@domain/workspace/workspace-page"
import { subscribeActionClicked } from "@infrastructure/chrome/action"
import { subscribeNamedCommand } from "@infrastructure/chrome/commands"
import { removeFramingSessionRules } from "@infrastructure/chrome/declarative-net-request"
import { extensionPageUrl } from "@infrastructure/chrome/extension-page-url"
import { handleBackgroundMessage } from "@infrastructure/chrome/handle-background-message"
import { subscribeRuntimeMessages } from "@infrastructure/chrome/runtime-messaging"
import { subscribeTabRemoved } from "@infrastructure/chrome/tabs"
import { backgroundLive } from "@infrastructure/layers"

export default defineBackground(() => {
  const runtime = ManagedRuntime.make(backgroundLive)
  const run = <Success, Error>(effect: Effect.Effect<Success, Error>) =>
    runtime.runPromise(effect)

  void run(
    Effect.log("runtime initialized").pipe(Effect.withLogSpan("background")),
  )
  subscribeRuntimeMessages(handleBackgroundMessage, run)
  subscribeTabRemoved((tabId) => {
    void run(removeFramingRules(tabId))
  })

  const workspaceUrl = extensionPageUrl(workspacePagePath)
  const open = (): void => {
    runtime.runFork(openWorkspaceTab(workspaceUrl))
  }
  subscribeActionClicked(open)
  subscribeNamedCommand(openWorkspaceCommandName, open)
})

const openWorkspaceTab = (workspaceUrl: string) =>
  Effect.log("open workspace", workspaceUrl).pipe(
    Effect.zipRight(openWorkspace(workspaceUrl)),
    Effect.catchAll(() => Effect.void),
    Effect.withLogSpan("openWorkspace"),
    Effect.withLogSpan("background"),
  )

const removeFramingRules = (tabId: number) =>
  Effect.log("remove framing rules", tabId).pipe(
    Effect.zipRight(removeFramingSessionRules(tabId)),
    Effect.tapError((error) =>
      Effect.logWarning("remove framing rules failed", error),
    ),
    Effect.ignore,
    Effect.withLogSpan("removeFramingRules"),
    Effect.withLogSpan("background"),
  )
