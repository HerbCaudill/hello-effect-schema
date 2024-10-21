import { ParseResult, Schema as S } from '@effect/schema'
import { Effect as E } from 'effect'
import { TimeEntryParseError } from './TimeEntryParseError'

/** Finds and parses a duration, expressed in decimal or hours:minutes, from inside a string of text */
export class ParsedDuration extends S.Class<ParsedDuration>('Duration')({
  /** The original input string, e.g. `#out 1:15 dentist` */
  input: S.String,

  /** The duration in text form, e.g. `1:15` */
  text: S.String,

  /** The duration in minutes, e.g. 75 */
  duration: S.Number,
}) {
  static fromInput(input: string): E.Effect<ParsedDuration, Error> {
    const formats = [
      // 1:15, :15
      /^(?<text>(?<hrs>\d+)?:(?<mins>\d+))$/i,
      // 1h, 2hrs, 1h45, 1h45m
      /^(?<text>(?<hrs>\d+)(hrs|hr|h)((?<mins>\d+)(mins|min|m)?)?)$/i,
      // 45m, 45min
      /^(?<text>(?<mins>\d+)(mins|min|mn|m))$/i,
      // 2.15, .25, 2.15hrs
      /^(?<text>(?<hrsDecimal>\d*\.\d+)(hrs|hr|h)?)$/i,
    ]

    let result: ParsedDuration | undefined

    for (const word of input.split(/\s+/)) {
      for (const format of formats) {
        const match = word.match(format)
        if (match) {
          const { text, hrs = '0', mins = '0', hrsDecimal } = match.groups!
          const duration = hrsDecimal
            ? Math.round(Number(hrsDecimal) * 60) // decimal
            : Number(hrs) * 60 + Number(mins) // hours+minutes

          // Make sure we got a valid non-zero number
          if (duration <= 0 || isNaN(duration)) continue

          // Can't have more than one result
          if (result) return E.fail(new MultipleDurationsError({ input }))

          result = { input, text, duration }
        }
      }
    }

    return result ? E.succeed(result) : E.fail(new NoDurationError({ input }))
  }
}

export class MultipleDurationsError extends TimeEntryParseError {
  _tag = 'MULTIPLE_DURATIONS'
  constructor(context: { input: string }) {
    super(`An entry can only have one duration.`, { context })
  }
}

export class NoDurationError extends TimeEntryParseError {
  _tag = 'NO_DURATION'
  constructor(context: { input: string }) {
    super(`An entry must include a duration`, { context })
  }
}
