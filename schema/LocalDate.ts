import { ParseResult, Schema as S } from '@effect/schema'
import { LocalDate } from '@js-joda/core'

export const isLocalDate = (x: unknown): x is LocalDate => x instanceof LocalDate
export const LocalDateSchema = S.declare(isLocalDate)
export const LocalDateFromString = S.transformOrFail(
  S.String, // source
  LocalDateSchema, // target
  {
    decode: (s, options, ast) => {
      try {
        return ParseResult.succeed(LocalDate.parse(s))
      } catch (e) {
        return ParseResult.fail(new ParseResult.Type(ast, s, `string could not be parsed as LocalDate`))
      }
    },
    encode: d => ParseResult.succeed(d.toString()),
  }
)
