import { Schema as S } from '@effect/schema'
import { Effect as E } from 'effect'
import {
  buildRegExp,
  capture, //
  choiceOf,
  endOfString,
  optional,
  startOfString,
} from 'ts-regex-builder'
import { TimeEntryParseError } from './TimeEntryParseError'
import { number } from './regex'

/** Finds and parses a duration, expressed in decimal or hours:minutes, from inside a string of text */
export class ParsedDuration extends S.Class<ParsedDuration>('Duration')({
  /** The duration in text form, e.g. `1:15` */
  text: S.String,

  /** The duration in minutes, e.g. 75 */
  duration: S.Number,
}) {
  static fromInput(input: string): E.Effect<ParsedDuration, Error> {
    const HR = choiceOf('hrs', 'hr', 'h')
    const MIN = choiceOf('mins', 'min', 'mn', 'm')
    const formats = [
      // 2.15, .25, 2.15hrs
      [
        optional([capture(number, { name: 'hrs' })]), //
        ':',
        capture(number, { name: 'mins' }),
      ],

      // 1h, 2hrs, 1h45, 1h45m
      [
        capture(number, { name: 'hrs' }),
        HR,
        optional([capture(number, { name: 'mins' }), optional(MIN)]),
      ],

      // 45m, 45min
      [
        capture(number, { name: 'mins' }), //
        MIN,
      ],

      // 2.15, .25, 2.15hrs
      [
        capture([optional(number), '.', number], { name: 'hrsDecimal' }), //
        optional(HR),
      ],
    ].map(f => buildRegExp([startOfString, ...f, endOfString], { ignoreCase: true }))

    const results = input
      .split(/\s+/)
      .map(word => {
        for (const format of formats) {
          const match = word.match(format)
          if (match) {
            const { text, hrs = '0', mins = '0', hrsDecimal } = match.groups!

            const duration = hrsDecimal
              ? Math.round(Number(hrsDecimal) * 60) // decimal
              : Number(hrs) * 60 + Number(mins) // hours+minutes

            // Only return this if we got a valid non-zero number
            if (duration > 0 && !isNaN(duration)) return { text, duration }
          }
        }
      })
      .filter(r => r !== undefined)

    if (results.length > 1) return E.fail(new MultipleDurationsError({ input }))
    if (results.length === 0) return E.fail(new NoDurationError({ input }))
    return E.succeed(results[0])
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
