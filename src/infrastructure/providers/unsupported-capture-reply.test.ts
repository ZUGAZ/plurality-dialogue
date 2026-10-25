// @vitest-environment happy-dom
import { Effect, Layer } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { silentLoggerLayer } from "@test-support/silent-logger"
import { executeCaptureReply } from "../../domain/broadcast/execute-capture-reply"
import type { PanelIdentity } from "../../domain/broadcast/execute-panel-command"
import { isPanelCommandErr } from "../../domain/messaging/panel-command-err"
import { ProviderPage } from "../../domain/ports/provider-page"
import { makeDeepseekProviderPage } from "./deepseek/fill-send"
import { makeDoubaoProviderPage } from "./doubao/fill-send"
import { makeGoogleProviderPage } from "./google/fill-send"
import { makeKimiProviderPage } from "./kimi/fill-send"
import { makeQwenChinaProviderPage } from "./qwen-china/fill-send"
import { makeQwenGlobalProviderPage } from "./qwen-global/fill-send"
import { makeZaiProviderPage } from "./zai/fill-send"
import { makeZhipuProviderPage } from "./zhipu/fill-send"

const identity: PanelIdentity = { providerId: "chatgpt", panelId: "panel-1" }

const vendors: ReadonlyArray<
  readonly [
    string,
    (root: ParentNode) => ReturnType<typeof makeDeepseekProviderPage>,
  ]
> = [
  ["deepseek", makeDeepseekProviderPage],
  ["kimi", makeKimiProviderPage],
  ["doubao", makeDoubaoProviderPage],
  ["google", makeGoogleProviderPage],
  ["qwen-china", makeQwenChinaProviderPage],
  ["qwen-global", makeQwenGlobalProviderPage],
  ["zhipu", makeZhipuProviderPage],
  ["zai", makeZaiProviderPage],
]

describe("unsupported reply capture", () => {
  for (const [name, makePage] of vendors) {
    it.effect(`${name} captureReply fails as capture-unsupported`, () =>
      Effect.gen(function* () {
        const response = yield* executeCaptureReply(identity).pipe(
          Effect.provide(
            Layer.succeed(ProviderPage, makePage(document)),
          ),
          Effect.provide(silentLoggerLayer),
        )
        expect(isPanelCommandErr(response)).toBe(true)
        if (isPanelCommandErr(response)) {
          expect(response.reason).toBe("capture-unsupported")
        }
      }),
    )
  }
})
