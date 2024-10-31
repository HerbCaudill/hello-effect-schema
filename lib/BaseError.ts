import { Data } from 'effect'

export const BaseError = <Context extends Record<string, unknown>>(tag: string) => {
  abstract class CustomError extends Data.TaggedError(tag) {
    constructor(public readonly message: string, public readonly context: Context) {
      super()
    }
  }
  return CustomError
}
