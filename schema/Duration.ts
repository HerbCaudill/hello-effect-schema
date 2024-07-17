import { ParseResult, Schema as S } from '@effect/schema'

/** Parses a duration, expressed in decimal or hours:minutes, from inside a string of text */
export class Duration extends S.Class<Duration>('Duration')({
  /** The full string from which the duration was parsed, e.g. `#overhead 1:45  */
  input: S.String,

  /** The duration in text form, e.g. `1:45` */
  text: S.String,

  /** The duration in minutes, e.g. 105 */
  duration: S.Number,
}) {}

export const DurationFromString = S.transformOrFail(S.String, Duration, {
  strict: true,
  decode: (input, options, ast) => {
    const results: Array<{ text: string; duration: number }> = []

    {
      const hoursColonMinsRx = /(?:^|\s)(?<text>(?<hrs>\d+)?:(?<mins>\d+))(?:$|\s)/gim
      const matches = input.matchAll(hoursColonMinsRx)
      // console.log('*** matches', Array.from(matches))
      for (const match of matches) {
        // console.log('*** match', match)
        const { text, hrs = 0, mins = 0 } = match.groups as Record<string, string>
        const duration = Number(hrs) * 60 + Number(mins)
        results.push({ text, duration })
      }
    }

    {
      const hoursMinRegex =
        /(?:^|\s)(?<text>(?<hrs>\d+)(hrs|hr|h)(?<minsOfHour>\d+(mins|min|m)?)?|((?<minsAlone>\d+)(mins|min|m)))(?:$|\s)/gim
      const matches = input.matchAll(hoursMinRegex)
      for (const match of matches) {
        const { text, hrs = 0, minsOfHour = 0, minsAlone = 0 } = match.groups as Record<string, string>
        const mins = Number(minsOfHour) || Number(minsAlone)
        const duration = Number(hrs) * 60 + mins
        results.push({ text, duration })
      }
    }

    {
      const decimalRegex = /(?:^|\s)(\d*\.?\d+)(?:$|\s)/gim
      const matches = input.match(decimalRegex)
      if (matches && matches.length > 0) {
        const text = matches[0].trim()
        const duration = Math.round(Number(text) * 60)
        results.push({ text, duration })
      }
    }

    // console.log('***', results)
    if (results.length > 1) {
      return ParseResult.fail(new ParseResult.Type(ast, input, 'MULTIPLE_DURATIONS'))
    }
    if (results.length === 0) return ParseResult.fail(new ParseResult.Type(ast, input, 'NO_DURATION'))

    const result = { ...results[0], input }
    return ParseResult.succeed(result)
  },
  // to encode, we just return the original input string
  encode: ({ input }, options, ast) => ParseResult.succeed(input),
})
