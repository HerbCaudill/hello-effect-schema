import { ParseResult, Schema as S } from '@effect/schema'
import { Either } from 'effect'
import { assert, expect, test } from 'vitest'

export const DurationFromInput = S.transformOrFail(S.String, S.Number, {
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

    let result: number | undefined

    for (const word of input.split(/\s+/)) {
      for (const format of formats) {
        const match = word.match(format)
        if (match) {
          const { text, hrs = '0', mins = '0', hrsDecimal } = match.groups!
          const minutes = hrsDecimal
            ? Math.round(Number(hrsDecimal) * 60) // decimal
            : Number(hrs) * 60 + Number(mins) // hours+minutes

          // Make sure we got a valid non-zero number
          if (minutes <= 0 || isNaN(minutes)) continue

          // Can't have more than one result
          if (result) return fail('MULTIPLE_DURATIONS')

          result = minutes
        }
      }
    }

    return result ? ParseResult.succeed(result) : fail('NO_DURATION')
  },

  encode: duration => ParseResult.succeed(`${duration}min`),
})

const decode = S.decodeEither(DurationFromInput)
const result = decode(`#overhead 1hr staff meeting`)
assert(Either.isRight(result))
const decoded = result.right
expect(decoded).toBe(60)
