import { ParseResult, Schema as S } from '@effect/schema'

/** Finds and parses a duration, expressed in decimal or hours:minutes, from inside a string of text */
export class Duration extends S.Class<Duration>('Duration')({
  /** The duration in text form, e.g. `1:15` */
  text: S.String,

  /** The duration in minutes, e.g. 75 */
  duration: S.Number,
}) {}

export const DurationFromInput = S.transformOrFail(S.String, Duration, {
  strict: true,
  decode: (input, _, ast) => {
    const fail = (message: string) => ParseResult.fail(new ParseResult.Type(ast, input, message))

    const formats = [
      // 1:15, :15
      /^(?<text>(?<hrs>\d+)?:(?<mins>\d+))$/i,
      // 1h, 2hrs, 1h45, 1h45m
      /^(?<text>(?<hrs>\d+)(hrs|hr|h)((?<mins>\d+)(mins|min|m)?)?)$/i,
      // 45m, 45min
      /^(?<text>(?<mins>\d+)(mins|min|m))$/i,
      // 2.15, .25, 2.15hrs
      /^(?<text>(?<hrsDecimal>\d*\.\d+)(hrs|hr|h)?)$/i,
    ]

    let result: { text: string; duration: number } | undefined

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
          if (result) return fail('MULTIPLE_DURATIONS')

          result = { text, duration }
        }
      }
    }

    return result ? ParseResult.succeed(result) : fail('NO_DURATION')
  },

  encode: ({ text }) => ParseResult.succeed(text),
})
