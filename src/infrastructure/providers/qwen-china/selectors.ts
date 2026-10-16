export const primaryComposerSelector =
  '[data-slate-editor="true"][role="textbox"]'

export const composerSelectors: readonly string[] = [primaryComposerSelector]

export const primarySendSelector =
  'button[data-session-switch-target="send-query"]'

export const sendSelectors: readonly string[] = [
  primarySendSelector,
  'button[aria-label="发送消息"]',
]
