import { Effect, ManagedRuntime } from "effect"
import { defineBackground } from "#imports"
import type { ContextMenuDraftSource } from "@domain/workspace/context-menu-draft"
import { openWorkspace } from "@domain/workspace/open-workspace"
import {
  openWorkspaceCommandName,
  workspacePagePath,
} from "@domain/workspace/workspace-page"
import { subscribeActionClicked } from "@infrastructure/chrome/action"
import { subscribeNamedCommand } from "@infrastructure/chrome/commands"
import { registerSendToPluralityDialogueMenu } from "@infrastructure/chrome/context-menus"
import { removeFramingSessionRules } from "@infrastructure/chrome/declarative-net-request"
import { deliverContextMenuClick } from "@infrastructure/chrome/deliver-context-menu"
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
  registerSendToPluralityDialogueMenu((click) => {
    runtime.runFork(deliverContextMenuToWorkspace(workspaceUrl, click))
  })
})

const openWorkspaceTab = (workspaceUrl: string) =>
  Effect.log("open workspace", workspaceUrl).pipe(
    Effect.zipRight(openWorkspace(workspaceUrl)),
    Effect.catchAll(() => Effect.void),
    Effect.withLogSpan("openWorkspace"),
    Effect.withLogSpan("background"),
  )

const deliverContextMenuToWorkspace = (
  workspaceUrl: string,
  click: ContextMenuDraftSource,
) =>
  Effect.log("deliver context menu").pipe(
    Effect.zipRight(deliverContextMenuClick(workspaceUrl, click)),
    Effect.tapError((error) =>
      Effect.logWarning("context menu delivery failed", error),
    ),
    Effect.ignore,
    Effect.withLogSpan("deliverContextMenu"),
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
