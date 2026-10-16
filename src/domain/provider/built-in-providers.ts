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
  {
    id: "grok",
    displayName: "Grok",
    host: "grok.com",
    url: "https://grok.com/",
    iconId: "grok",
  },
  {
    id: "deepseek",
    displayName: "DeepSeek",
    host: "chat.deepseek.com",
    url: "https://chat.deepseek.com/",
    iconId: "deepseek",
  },
  {
    id: "kimi",
    displayName: "Kimi",
    host: "www.kimi.com",
    url: "https://www.kimi.com/",
    iconId: "kimi",
  },
  {
    id: "doubao",
    displayName: "Doubao",
    host: "www.doubao.com",
    url: "https://www.doubao.com/chat/",
    iconId: "doubao",
  },
  {
    id: "google",
    displayName: "Google AI Mode",
    host: "www.google.com",
    url: "https://www.google.com/search?udm=50",
    iconId: "google",
  },
]
