import { Effect, Runtime } from "effect"

export type RunEffect<Requirements> = <Success, Error>(
  effect: Effect.Effect<Success, Error, Requirements>,
) => void

type BoundProperty<Value> = Value extends Effect.Effect<
  infer _Success,
  infer _Error,
  infer _Requirements
>
  ? () => void
  : Value

export type BoundViewModel<ViewModel extends Record<string, unknown>> = {
  readonly [Key in keyof ViewModel]: BoundProperty<ViewModel[Key]>
}

const isRuntimeEffect = <Requirements>(
  value: unknown,
): value is Effect.Effect<unknown, unknown, Requirements> =>
  Effect.isEffect(value)

export const bindViewModel = <
  Requirements,
  ViewModel extends Record<string, unknown>,
>(
  runtime: Runtime.Runtime<Requirements>,
  createViewModel: (runEffect: RunEffect<Requirements>) => ViewModel,
): BoundViewModel<ViewModel> => {
  const runEffect: RunEffect<Requirements> = (effect) => {
    Runtime.runFork(runtime)(effect)
  }
  const viewModel = createViewModel(runEffect)
  return Object.fromEntries(
    Object.entries(viewModel).map(([key, value]) => {
      if (isRuntimeEffect<Requirements>(value)) {
        const boundAction = () => {
          runEffect(value)
        }
        const boundEntry: [string, () => void] = [key, boundAction]
        return boundEntry
      }
      const passthroughEntry: [string, unknown] = [key, value]
      return passthroughEntry
    }),
  ) as BoundViewModel<ViewModel> // fromEntries cannot preserve keys
}
