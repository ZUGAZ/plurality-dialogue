import { Effect, ManagedRuntime, Option } from "effect"
import {
  resolveBroadcastTargets,
  toVisiblePanels,
  upsertFrameHello,
} from "@domain/broadcast/resolve-targets"
import { isDialogueEnginePanelId } from "@domain/dialogue/engine-panel-id"
import type { PanelTarget } from "@domain/broadcast/panel-target"
import { layoutIdOrDefault } from "@domain/layout/presets"
import type { Messaging } from "@domain/ports/messaging"
import type { PromptLibrary } from "@domain/ports/prompt-library"
import type { Storage } from "@domain/ports/storage"
import { Tabs } from "@domain/ports/tabs"
import { loadWorkspaceSettings } from "@domain/settings/workspace-settings-storage"
import { subscribeWorkspacePanelHellos } from "@infrastructure/chrome/panel-frame-hello"
import { bindWorkspaceContextMenuDraft } from "@infrastructure/chrome/workspace-context-menu"
import { workspaceLive } from "@infrastructure/layers"
import { bindViewModel } from "@ui/common/viewmodel/bind-viewmodel"
import { createDialogueModeViewModel } from "@ui/workspace/dialogue-mode/view-model"
import { dialogueViewProps } from "@ui/workspace/dialogue-mode/view-props"
import { dialogueFloorProps } from "@ui/workspace/dialogue-floor/model"
import { createDialogueFloorViewModel } from "@ui/workspace/dialogue-floor/view-model"
import { createPanelGridViewModel } from "@ui/workspace/panel-grid/view-model"
import { wireTemporaryChat } from "@ui/workspace/panel-grid/wire-temporary-chat"
import { createPanelRoleViewModel } from "@ui/workspace/panel-role/view-model"
import { setupLibraryShortcut } from "@ui/workspace/prompt-library/library-shortcut"
import { createPromptLibraryViewModel } from "@ui/workspace/prompt-library/view-model"
import { createShellViewModel } from "@ui/workspace/shell/view-model"
import { setupFocusGuard } from "@ui/workspace/unified-input/focus-guard"
import { createUnifiedInputViewModel } from "@ui/workspace/unified-input/view-model"
import {
  applyWorkspaceColorScheme,
  subscribeOpenWorkspaceSettings,
} from "./subscribe-open-workspace-settings"

const managedRuntime = ManagedRuntime.make(workspaceLive)
const runtime = Effect.runSync(managedRuntime)

export const workspaceBindingsReady = managedRuntime.runPromise(
  Effect.gen(function* () {
    yield* Effect.log("runtime initialized")
    const settings = yield* loadWorkspaceSettings()
    yield* Effect.sync(() => {
      applyWorkspaceColorScheme(settings.theme)
    })
    const tabs = yield* Tabs
    const workspaceTabId = yield* tabs.currentTabId().pipe(Effect.option)
    const frames = createFrameList()
    const engineFrames = createEngineFrameList()
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
          enabledProviderIds: settings.enabledProviders,
        },
        frames.list,
        {
          panelRoles: panelRole.panelRoles,
          applyPanelRoles: panelRole.replacePanelRoles,
        },
      ),
    )
    const { applyEnabledProviderIds, ...workspaceGrid } = grid
    yield* Effect.sync(() => {
      subscribeOpenWorkspaceSettings({
        theme: applyWorkspaceColorScheme,
        enabledProviderIds: applyEnabledProviderIds,
      })
    })
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
    // The mode method is an Effect; the floor host waits on a Promise.
    let reloadDialogueTranscript:
      | (() => Effect.Effect<void, never, Storage>)
      | undefined
    const dialogueMode = bindViewModel(runtime, "dialogueMode", (runEffect) => {
      const mode = createDialogueModeViewModel(runEffect, {
        framingReady: grid.framingReady,
        engineFrames: engineFrames.list,
        forgetEngineFrames: engineFrames.forgetAll,
        enabledProviderIds: () => grid.options().map((option) => option.id),
        catalog: () => ({ roles: panelRole.catalog() ?? [] }),
      })
      reloadDialogueTranscript = mode.reloadTranscript
      return mode
    })
    const dialogueFloor = bindViewModel(
      runtime,
      "dialogueFloor",
      (runEffect) =>
        createDialogueFloorViewModel(runEffect, {
          phase: dialogueMode.phase,
          setup: dialogueMode.setup,
          transcript: dialogueMode.transcript,
          resolvedCast: dialogueMode.resolvedCast,
          resolveTargetForCastIndex: dialogueMode.resolveTargetForCastIndex,
          reloadTranscript: () => {
            const reload = reloadDialogueTranscript
            if (reload === undefined) {
              return Promise.resolve()
            }
            return managedRuntime.runPromise(reload())
          },
        }),
    )
    const dialogue = {
      ...dialogueViewProps(dialogueMode, {
        providerOptions: grid.options,
        roleOptions: panelRole.roleOptions,
        roleDisabled: () => !panelRole.rolesReady(),
      }),
      floor: dialogueFloorProps(dialogueFloor),
    }
    yield* Effect.sync(() => {
      Option.match(workspaceTabId, {
        onNone: () => undefined,
        onSome: (tabId) => {
          subscribeWorkspacePanelHellos<Storage | Tabs | Messaging>(
            tabId,
            (hello) => {
              if (isDialogueEnginePanelId(hello.panelId)) {
                if (dialogueMode.workspaceMode() === "dialogue") {
                  engineFrames.upsert(hello)
                }
                return
              }
              frames.upsert(hello)
              temporaryChatWire.onFrameHello(hello)
            },
            (effect) => managedRuntime.runPromise(effect),
          )
        },
      })
    })
    return {
      ...workspaceGrid,
      collapsed: shell.collapsed,
      onToggleCollapse: shell.toggleCollapse,
      workspaceMode: dialogueMode.workspaceMode,
      onWorkspaceMode: dialogueMode.setWorkspaceMode,
      dialogue,
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

const createEngineFrameList = () => {
  const frames = createFrameList()
  return {
    list: frames.list,
    upsert: frames.upsert,
    forgetAll: (): void => {
      frames.forget(frames.list().map((row) => row.panelId))
    },
  }
}
