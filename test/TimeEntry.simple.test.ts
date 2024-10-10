import { Schema as S } from '@effect/schema'
import { LocalDate } from '@js-joda/core'
import { Effect as E, Either, pipe } from 'effect'
import { assert, describe, expect, test } from 'vitest'
import {
  TimeEntryInput,
  ParsedTimeEntryFromInput,
  TimeEntryFromParsedTimeEntry,
  type ParsedTimeEntry,
} from '../schema/TimeEntrySimple'

describe('TimeEntry (simple)', () => {
  describe('ParsedTimeEntry from input', () => {
    const testCases = [
      // failure
      {
        input: '#Support: Ongoing @aba update geography',
        error: 'NO_DURATION',
      },

      // success
      {
        input: '1h #Support: Ongoing @ABA update geography',
        duration: 60,
      },
    ] as TestCase[]

    const decode = (input: TimeEntryInput) =>
      pipe(
        input, //
        S.decode(ParsedTimeEntryFromInput),
        E.either,
      )

    for (const { input, error, duration, only, skip } of testCases) {
      const testFn = only ? test.only : skip ? test.skip : test

      testFn(input, () => {
        const decoded = E.runSync(decode({ input }))
        Either.match(decoded, {
          onLeft: e => {
            assert(error, `expected success but got error ${e.message}`)
            expect(e.message).toContain(error)
          },
          onRight: parsed => {
            assert(!error, `expected error ${error} but got success`)
            expect(parsed.input).toEqual(input)
            expect(parsed.duration.minutes).toEqual(duration)
          },
        })
      })
    }
  })

  describe('TimeEntryFromParsedTimeEntry', () => {
    const input = '1h #Support: Ongoing @aba update geography'
    const parsedTimeEntry: ParsedTimeEntry = {
      input,
      duration: { input, text: '1h', minutes: 60 },
    }

    const decode = (parsedTimeEntry: ParsedTimeEntry) =>
      pipe(
        { input: parsedTimeEntry.input, duration: parsedTimeEntry.input }, //
        S.decode(TimeEntryFromParsedTimeEntry),
        E.either,
      )

    test('decodes ', () => {
      const decoded = E.runSync(decode(parsedTimeEntry))
      Either.match(decoded, {
        onLeft: e => {
          throw new Error()
        },
        onRight: parsed => {
          expect(parsed.input).toEqual(input)
          expect(parsed.duration).toEqual(60)
        },
      })
    })
  })
})

type TestCase = {
  input: string
  error?: string
  duration?: number
  projectId?: string
  clientId?: string
  description?: string
  only?: boolean
  skip?: boolean
}

const only = true
const skip = true
