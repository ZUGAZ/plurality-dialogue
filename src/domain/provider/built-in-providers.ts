import type { ProviderDefinition } from "./provider"

export const builtInProviders: readonly ProviderDefinition[] = [
  {
    id: "chatgpt",
    displayName: "ChatGPT",
    host: "chatgpt.com",
    url: "https://chatgpt.com/",
    iconId: "chatgpt",
  },
  {
    id: "claude",
    displayName: "Claude",
    host: "claude.ai",
    url: "https://claude.ai/new",
    iconId: "claude",
  },
  {
    id: "gemini",
    displayName: "Gemini",
    host: "gemini.google.com",
    url: "https://gemini.google.com/app",
    iconId: "gemini",
  },
]
