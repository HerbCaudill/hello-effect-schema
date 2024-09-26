import { ParseResult, Schema as S } from '@effect/schema'
import { Effect as E, Either, pipe } from 'effect'
import { expect, test } from 'vitest'

class One extends S.Class<One>('One')({
  input: S.String,
}) {}

class Two extends S.Class<Two>('Two')({
  input: S.String,
  length: S.String,
}) {}

class Three extends S.Class<Three>('Three')({
  input: S.String,
  length: S.NumberFromString,
  doubleLength: S.Number,
}) {}

// Decoders

const TwoFromOne = S.transformOrFail(One, Two, {
  strict: true,
  decode: ({ input }) =>
    ParseResult.succeed({
      input,
      length: input.length.toString(),
    }),
  encode: ({ input }) =>
    ParseResult.succeed({
      input,
    }),
})

const ThreeFromTwo = S.transformOrFail(Two, Three, {
  strict: true,
  decode: ({ input, length }, _) =>
    ParseResult.succeed({
      input,
      length,
      doubleLength: Number(length) * 2,
    }),
  encode: ({ input, length }, _options, ast) =>
    ParseResult.succeed({
      input,
      length,
    }),
})

const ThreeFromOne = S.compose(TwoFromOne, ThreeFromTwo)

test('ThreeFromOne', () => {
  const decode = (x: One) =>
    pipe(
      x, //
      S.decode(ThreeFromOne),
      E.either,
    )

  const result = E.runSync(decode({ input: 'hello' }))

  Either.match(result, {
    onLeft: e => {
      throw e
    },
    onRight: result => {
      expect(result.input).toEqual('hello')
      expect(result.length).toEqual(5)
      expect(result.doubleLength).toEqual(10)
    },
  })
})
