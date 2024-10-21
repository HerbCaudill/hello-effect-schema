export abstract class TimeEntryParseError extends Error {
  public readonly context?: JsonObject
  public readonly _tag: string = 'HOURS_PARSE_ERROR'

  constructor(message: string, { cause, context }: ErrorOptions = {}) {
    super(`${message}\n${JSON.stringify(context)}`, { cause })
    this.context = context
  }
}

type JsonObject =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly JsonObject[]
  | { readonly [key: string]: JsonObject }
  | { toJSON(): JsonObject }

type ErrorOptions = {
  cause?: Error
  context?: JsonObject
}
