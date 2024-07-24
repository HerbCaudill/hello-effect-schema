import { ParseResult, Schema as S } from '@effect/schema'
import { Effect as E, pipe } from 'effect'

class One extends S.Class<One>('One')({
  input: S.String,
}) {}

class Two extends S.Class<Two>('Two')({
  input: S.String,
  length: S.Number,
}) {}

class Three extends S.Class<Three>('Three')({
  input: S.String,
  length: S.Number,
  doubleLength: S.Number,
}) {}

// Decoders

const TwoFromOne = S.transformOrFail(One, Two, {
  strict: true,
  decode: ({ input }) =>
    ParseResult.succeed({
      input,
      length: input.length,
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
      doubleLength: length * 2,
    }),
  encode: ({ input, length }, _options, ast) =>
    ParseResult.succeed({
      input,
      length,
    }),
})

const ThreeFromOne = S.transformOrFail(One, Three, {
  strict: true,
  decode: (x: One) =>
    pipe(
      x, //
      S.decode(TwoFromOne),
      E.flatMap(S.decode(ThreeFromTwo)),
    ),
  encode: (final, options, ast) =>
    ParseResult.succeed({
      input: final.input,
    } as One),
})

const decode = (x: One) =>
  pipe(
    x, //
    S.decode(ThreeFromOne),
    E.either,
  )

const result = E.runSync(decode({ input: 'hello' }))
