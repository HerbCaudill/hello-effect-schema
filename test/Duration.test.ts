import { Schema as S } from '@effect/schema'
import { assert, describe, expect, it, test } from 'vitest'
import { DurationFromString } from '../schema/Duration'
import { Either } from 'effect'

describe('Duration', () => {
  const decode = S.decodeEither(DurationFromString)

  const testCases: TestCase[] = [
    { input: '@aba', error: 'NO_DURATION' },
    { input: '#business: proposals #overhead 2.25 @aba', text: '2.25', duration: 135 },
    { input: '#proposals', error: 'NO_DURATION' },
    { input: '@globalwaterpartnership #proposals #overhead', error: 'NO_DURATION' },
    { input: '@INL', error: 'NO_DURATION' },
    { input: '@globalwaterpartnership description', error: 'NO_DURATION' },
    { input: '#overhead -:45', error: 'NO_DURATION' }, // the minus sign keeps it from seeing this as a duration
    { input: '#overhead 12:01', text: '12:01', duration: 721 },
    { input: '#overhead 721min', text: '721min', duration: 721 },
    { input: '#overhead 1:30 and 1:31', error: 'MULTIPLE_DURATIONS' },
    { input: '#overhead 1:01 25min', error: 'MULTIPLE_DURATIONS' },
    { input: '#overhead, 1.25min', error: 'NO_DURATION' },
    { input: '#overhead 1.15', text: '1.15', duration: 69 },
    { input: '1.15 #overhead', text: '1.15', duration: 69 },
    { input: '#overhead .25', text: '.25', duration: 15 },
    { input: '#overhead 1h', text: '1h', duration: 60 },
    { input: '1h #overhead', text: '1h', duration: 60 },
    { input: '#overhead 1h30', text: '1h30', duration: 90 },
    { input: '#overhead 1h30', text: '1h30', duration: 90 },
    { input: '#overhead 1h', text: '1h', duration: 60 },
    { input: '#overhead 1H', text: '1H', duration: 60 },
    { input: '#overhead 2:15', text: '2:15', duration: 135 },
    { input: '#overhead :45', text: ':45', duration: 45 },
    { input: '#overhead 55min', text: '55min', duration: 55 },
    { input: '#overhead 95MIN', text: '95MIN', duration: 95 },
    { input: '#overhead 105mIn', text: '105mIn', duration: 105 },
    { input: '#overhead 105MIN', text: '105MIN', duration: 105 },
    { input: '#overhead 240m', text: '240m', duration: 240 },
    { input: '#overhead 360M', text: '360M', duration: 360 },
    { input: '#overhead 240m', text: '240m', duration: 240 },
    { input: '@globalwaterpartnership #overhead 360M description', text: '360M', duration: 360 },
    { input: 'meeting @inl price justification #proposals 2:15', text: '2:15', duration: 135 },

    // TODO: the second duration is ignored because the space is captured by the first regex match
    { input: '#overhead 1:30 1:31', text: '1:30', duration: 90 },
    { input: '#overhead 1h 2h', text: '1h', duration: 60 },
  ]

  for (const { input, error, text, duration, only, skip } of testCases) {
    const testFn = only ? test.only : skip ? test.skip : test

    testFn(input, () => {
      const result = decode(input)
      if (Either.isLeft(result)) {
        assert(error, `expected success but got error ${result.left.error.error.message.value}`)

        // @ts-ignore
        expect(result.left.error.error.message.value).toBe(error) // <- wtf
      } else {
        assert(!error, `expected error ${error}`)

        const parseResult = result.right
        expect(parseResult.input).toEqual(input)
        expect(parseResult.text).toEqual(text)
        expect(parseResult.duration).toEqual(duration)
      }
    })
  }
})

type TestCase = {
  input: string
  error?: string
  text?: string
  duration?: number
  only?: boolean
  skip?: boolean
}
