import { Effect as E, Either, pipe } from 'effect'
import { test as _test, assert, expect } from 'vitest'

export const runTestCases = <TestCase extends BaseTestCase, ExpectedSchema extends Object | null>({
  testCases,
  decoder,
  label = ({ input }) => input,
  mapResult = result => result,
}: {
  testCases: TestCase[]
  decoder: (input: string) => E.Effect<ExpectedSchema, Error>
  label?: (testCase: TestCase) => string
  mapResult?: (result: ExpectedSchema) => any
}) => {
  for (const testCase of testCases) {
    const { input, error, only, skip, ...testFields } = testCase
    const test = only ? _test.only : skip ? _test.skip : _test

    const decode = (input: string) =>
      pipe(
        input, //
        decoder,
        E.either,
        E.runSync,
      )
    test(label(testCase), () => {
      const result = decode(input)
      if (Either.isLeft(result)) {
        assert(error, `expected success but got error ${result.left}`)
        expect(result.left.toString()).toContain(error)
      } else {
        assert(!error, `expected error ${error}`)
        const parseResult = mapResult(result.right)
        for (const [key, value] of Object.entries(testFields))
          expect(parseResult[key]).toEqual(value)
      }
    })
  }
}

export const only = true
export const skip = true

export type BaseTestCase = {
  input: string
  error?: string
  only?: true
  skip?: true
}
