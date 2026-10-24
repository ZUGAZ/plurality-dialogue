// @vitest-environment happy-dom
import { describe, expect, it } from "vitest"
import {
  applyWorkspaceColorScheme,
  dispatchOpenWorkspaceSettings,
  type OpenWorkspaceSettingsApply,
} from "./subscribe-open-workspace-settings"

const recordApply = () => {
  const themes: string[] = []
  const enabledLists: string[][] = []
  const apply: OpenWorkspaceSettingsApply = {
    theme: (theme) => {
      themes.push(theme)
    },
    enabledProviderIds: (ids) => {
      enabledLists.push([...ids])
    },
  }
  return { apply, themes, enabledLists }
}

describe("dispatchOpenWorkspaceSettings", () => {
  it("passes theme and enabled ids from a valid document", () => {
    const recorded = recordApply()
    dispatchOpenWorkspaceSettings(
      {
        enabledProviders: ["gemini", "chatgpt"],
        layout: "1x3",
        theme: "dark",
        panelProviders: ["claude", "claude", "claude"],
        toolbarCollapsed: true,
      },
      recorded.apply,
    )
    expect(recorded.themes).toEqual(["dark"])
    expect(recorded.enabledLists).toEqual([["gemini", "chatgpt"]])
  })

  it("ignores a payload that does not decode", () => {
    const recorded = recordApply()
    dispatchOpenWorkspaceSettings(
      { enabledProviders: "chatgpt", layout: "1x3" },
      recorded.apply,
    )
    expect(recorded.themes).toEqual([])
    expect(recorded.enabledLists).toEqual([])
  })
})

describe("applyWorkspaceColorScheme", () => {
  it("writes the theme color scheme", () => {
    document.documentElement.style.colorScheme = ""
    applyWorkspaceColorScheme("dark")
    expect(document.documentElement.style.colorScheme).toBe("dark")
    applyWorkspaceColorScheme("system")
    expect(document.documentElement.style.colorScheme).toBe("light dark")
  })
})
