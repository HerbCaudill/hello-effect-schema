import { ParseResult, Schema as S } from '@effect/schema'

/** Parses a duration, expressed in decimal or hours:minutes, from inside a string of text */
export class Duration extends S.Class<Duration>('Duration')({
  /** The duration in text form, e.g. `1:45` */
  text: S.String,

  /** The duration in minutes, e.g. 105 */
  duration: S.Number,
}) {}

export const DurationFromString = S.transformOrFail(S.String, Duration, {
  strict: true,
  decode: (input, _, ast) => {
    const formats: Format[] = [
      {
        // 2:45, :55
        regex: /(?:^|\s)(?<text>(?<hrs>\d+)?:(?<mins>\d+))(?:$|\s)/gim,
        accessor: ({ text, hrs = '0', mins = '0' }) => {
          const duration = Number(hrs) * 60 + Number(mins)
          return { text, duration }
        },
      },
      {
        // 1h45, 1h, 1h45m, 45m, 1h45min, 45min
        regex:
          /(?:^|\s)(?<text>(?<hrs>\d+)(hrs|hr|h)(?<minsOfHour>\d+(mins|min|m)?)?|((?<minsAlone>\d+)(mins|min|m)))(?:$|\s)/gim,
        accessor: ({ text, hrs = '0', minsOfHour = '0', minsAlone = '0' }) => {
          const mins = Number(minsOfHour) || Number(minsAlone)
          const duration = Number(hrs) * 60 + mins
          return { text, duration }
        },
      },
      {
        // 2.15, .25
        regex: /(?:^|\s)(?<text>\d*\.?\d+)(?:$|\s)/gim,
        accessor: ({ text }) => {
          const duration = Math.round(Number(text) * 60)
          return { text, duration }
        },
      },
    ]

    const results = formats.flatMap(({ regex, accessor }) => {
      const matches = Array.from(input.matchAll(regex))
      return matches.map(match => accessor(match.groups as Record<string, string>))
    })

    if (results.length > 1)
      return ParseResult.fail(new ParseResult.Type(ast, input, 'MULTIPLE_DURATIONS'))
    if (results.length === 0)
      return ParseResult.fail(new ParseResult.Type(ast, input, 'NO_DURATION'))

    return ParseResult.succeed({ ...results[0], input })
  },

  encode: ({ text }) => ParseResult.succeed(text),
})

type Format = {
  regex: RegExp
  accessor: (groups: Record<string, string>) => { text: string; duration: number }
}
