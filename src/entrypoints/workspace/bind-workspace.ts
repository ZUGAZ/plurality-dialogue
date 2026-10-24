import { Effect, ManagedRuntime, Option } from "effect"
import {
  resolveBroadcastTargets,
  toVisiblePanels,
  upsertFrameHello,
} from "@domain/broadcast/resolve-targets"
import type { PanelTarget } from "@domain/broadcast/panel-target"
import { layoutIdOrDefault } from "@domain/layout/presets"
import type { Messaging } from "@domain/ports/messaging"
import type { PromptLibrary } from "@domain/ports/prompt-library"
import type { Storage } from "@domain/ports/storage"
import { Tabs } from "@domain/ports/tabs"
import { themeToColorScheme } from "@domain/settings/theme-preference"
import { loadWorkspaceSettings } from "@domain/settings/workspace-settings-storage"
import { subscribeWorkspacePanelHellos } from "@infrastructure/chrome/panel-frame-hello"
import { bindWorkspaceContextMenuDraft } from "@infrastructure/chrome/workspace-context-menu"
import { workspaceLive } from "@infrastructure/layers"
import { bindViewModel } from "@ui/common/viewmodel/bind-viewmodel"
import { createPanelGridViewModel } from "@ui/workspace/panel-grid/view-model"
import { wireTemporaryChat } from "@ui/workspace/panel-grid/wire-temporary-chat"
import { createPanelRoleViewModel } from "@ui/workspace/panel-role/view-model"
import { setupLibraryShortcut } from "@ui/workspace/prompt-library/library-shortcut"
import { createPromptLibraryViewModel } from "@ui/workspace/prompt-library/view-model"
import { createShellViewModel } from "@ui/workspace/shell/view-model"
import { setupFocusGuard } from "@ui/workspace/unified-input/focus-guard"
import { createUnifiedInputViewModel } from "@ui/workspace/unified-input/view-model"

const managedRuntime = ManagedRuntime.make(workspaceLive)
const runtime = Effect.runSync(managedRuntime)

export const workspaceBindingsReady = managedRuntime.runPromise(
  Effect.gen(function* () {
    yield* Effect.log("runtime initialized")
    const settings = yield* loadWorkspaceSettings()
    yield* Effect.sync(() => {
      document.documentElement.style.colorScheme = themeToColorScheme(
        settings.theme,
      )
    })
    const tabs = yield* Tabs
    const workspaceTabId = yield* tabs.currentTabId().pipe(Effect.option)
    const frames = createFrameList()
    const panelRole = bindViewModel(runtime, "panelRole", (runEffect) =>
      createPanelRoleViewModel(runEffect, {
        panelRoles: settings.panelRoles,
      }),
    )
    const grid = bindViewModel(runtime, "panelGrid", (runEffect) =>
      createPanelGridViewModel(
        runEffect,
        {
          layoutId: layoutIdOrDefault(settings.layout),
          panelProviders: settings.panelProviders,
        },
        frames.list,
        {
          panelRoles: panelRole.panelRoles,
          applyPanelRoles: panelRole.replacePanelRoles,
        },
      ),
    )
    const shell = bindViewModel(runtime, "shell", () =>
      createShellViewModel(settings.toolbarCollapsed),
    )
    const unifiedInput = bindViewModel(runtime, "unifiedInput", (runEffect) =>
      createUnifiedInputViewModel(
        runEffect,
        () =>
          resolveBroadcastTargets(
            toVisiblePanels(grid.panels()),
            frames.list(),
            livePanelIds(grid.panels()),
          ),
        (panels) =>
          resolveBroadcastTargets(
            panels,
            frames.list(),
            livePanelIds(grid.panels()),
          ),
      ),
    )
    bindWorkspaceContextMenuDraft<
      Storage | Tabs | Messaging | PromptLibrary
    >(
      (draftText) => {
        dropContextMenuDraft(unifiedInput, draftText)
      },
      (effect) => managedRuntime.runPromise(effect),
    )
    const promptLibrary = bindViewModel(runtime, "promptLibrary", (runEffect) =>
      createPromptLibraryViewModel(runEffect, {
        setDraft: unifiedInput.setDraft,
        focusPrompt: unifiedInput.focusPrompt,
      }),
    )
    const temporaryChatWire = wireTemporaryChat({
      temporaryChat: grid.temporaryChat,
      applyTemporaryChat: grid.applyTemporaryChat,
      panels: grid.panels,
      frames: frames.list,
      forgetFrames: frames.forget,
      clearStatus: unifiedInput.clearStatus,
      run: (effect) => managedRuntime.runPromise(effect),
    })
    yield* Effect.sync(() => {
      Option.match(workspaceTabId, {
        onNone: () => undefined,
        onSome: (tabId) => {
          subscribeWorkspacePanelHellos<Storage | Tabs | Messaging>(
            tabId,
            (hello) => {
              frames.upsert(hello)
              temporaryChatWire.onFrameHello(hello)
            },
            (effect) => managedRuntime.runPromise(effect),
          )
        },
      })
    })
    return {
      ...grid,
      collapsed: shell.collapsed,
      onToggleCollapse: shell.toggleCollapse,
      unifiedInput: {
        ...unifiedInput,
        onOpenLibrary: promptLibrary.open,
      },
      promptLibrary,
      panelRoleForm: {
        form: panelRole.form,
        actionError: panelRole.actionError,
        onName: panelRole.setName,
        onInstruction: panelRole.setInstruction,
        onSave: panelRole.save,
        onClose: panelRole.closeForm,
        onDelete: panelRole.remove,
      },
      roleBannerError: panelRole.bannerError,
      roleOptions: panelRole.roleOptions,
      roleDisabled: () => !panelRole.rolesReady(),
      roleIdAt: panelRole.roleIdAt,
      onRoleValue: panelRole.assignRole,
      onRoleAdd: panelRole.openCreate,
      onRoleEdit: panelRole.openEdit,
      newChatForAll: () => {
        unifiedInput.clearStatus()
        grid.newChatForAll()
        unifiedInput.focusPrompt()
      },
      onToggleTemporaryChat: temporaryChatWire.onToggle,
      mountFocusGuard: () =>
        setupFocusGuard(
          unifiedInput.focusPrompt,
          '[data-workspace="panel-grid"]',
        ),
      mountLibraryShortcut: () => setupLibraryShortcut(promptLibrary.toggle),
    }
  }).pipe(Effect.withLogSpan("workspace")),
)

const livePanelIds = (
  panels: ReadonlyArray<{ readonly id: string }>,
): ReadonlyArray<string> => panels.map((panel) => panel.id)

const dropContextMenuDraft = (
  input: {
    readonly setDraft: (text: string) => void
    readonly focusPrompt: () => void
  },
  draftText: string | undefined,
): void => {
  if (draftText === undefined) {
    return
  }
  const trimmed = draftText.trim()
  if (trimmed.length === 0) {
    return
  }
  input.setDraft(trimmed)
  input.focusPrompt()
}

const createFrameList = () => {
  let rows: readonly PanelTarget[] = []
  return {
    list: (): readonly PanelTarget[] => rows,
    upsert: (incoming: PanelTarget): void => {
      rows = upsertFrameHello(rows, incoming)
    },
    forget: (panelIds: readonly string[]): void => {
      if (panelIds.length === 0) {
        return
      }
      const dropping = new Set(panelIds)
      rows = rows.filter((row) => !dropping.has(row.panelId))
    },
  }
}
