import { Effect, ManagedRuntime, pipe } from "effect"
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
  subscribeRuntimeMessages(handleBackgroundMessage)
  subscribeTabRemoved((tabId) => {
    void Effect.runPromise(
      removeFramingSessionRules(tabId).pipe(Effect.ignore),
    )
  })

  const runtime = ManagedRuntime.make(backgroundLive)
  const workspaceUrl = extensionPageUrl(workspacePagePath)
  const open = (): void => {
    runtime.runFork(
      pipe(openWorkspace(workspaceUrl), Effect.catchAll(() => Effect.void)),
    )
  }
  subscribeActionClicked(open)
  subscribeNamedCommand(openWorkspaceCommandName, open)
})
