import { Effect as E, Either, pipe } from 'effect'
import { test as _test, assert, assertType, expect } from 'vitest'
import { TimeEntryParseError } from '../../schema/TimeEntryParseError'

export const runTestCases = <TestCase extends BaseTestCase, ExpectedSchema extends Object | null>({
  testCases,
  decoder,
  validate = () => {},
  label = ({ input }) => input,
}: {
  testCases: TestCase[]
  decoder: (input: string) => E.Effect<ExpectedSchema, Error>
  validate: (expected: TestCase, actual: ExpectedSchema) => void
  label?: (testCase: TestCase) => string
}) => {
  for (const testCase of testCases) {
    const { input, error, only, skip } = testCase
    const test = only ? _test.only : skip ? _test.skip : _test

    const decode = (input: string) =>
      pipe(
        input, //
        decoder,
        E.either,
        E.runSync,
      )

    const errorPadding = Math.max(...testCases.filter(tc => tc.error).map(tc => label(tc).length))
    const testName = error ? `⛔ ${input.padEnd(errorPadding)} ${error}` : `✅ ${label(testCase)}`

    test(testName, () => {
      const result = decode(input)
      if (Either.isLeft(result)) {
        const actualError = result.left as TimeEntryParseError
        assert(error, `expected success but got error ${actualError}`)
        expect(actualError._tag).toContain(error)
      } else {
        assert(!error, `expected error ${error}`)
        const parseResult = result.right
        validate(testCase, parseResult)
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
