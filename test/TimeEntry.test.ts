import { Schema as S } from '@effect/schema'
import { LocalDate } from '@js-joda/core'
import { Console, Either, Effect as E, pipe } from 'effect'
import { assert, describe, expect, expectTypeOf, it, test } from 'vitest'
import { Projects, ProjectsProvider } from '../schema/Project'
import {
  ParsedTimeEntryFromInput,
  TimeEntry,
  type TimeEntryEncoded,
  type TimeEntryInput,
} from '../schema/TimeEntry'
import { testProjects } from './testProjects'
import type { UserId } from '../schema/User'

/** Instantiated ProjectsProvider with our list of projects */
const TestProjects = new ProjectsProvider(testProjects)

describe('TimeEntry', () => {
  describe('ParsedTimeEntryFromInput', () => {
    const decode = (x: TimeEntryInput) =>
      pipe(
        x, //
        S.decode(ParsedTimeEntryFromInput),
        E.provideService(Projects, TestProjects),
        E.either,
      )

    const testCases: TestCase[] = [
      {
        input: '#Support: Ongoing @aba update geography',
        error: 'NO_DURATION',
      },

      {
        input: '1h #Support: Ongoing @aba update geography',
        duration: 60,
        projectId: '0005',
        clientId: '',
        description: '#Support: Ongoing @aba update geography', // needs whittled down as we parse and remove things
      },
    ]

    for (const {
      input,
      error,
      duration,
      clientId,
      projectId,
      description,
      only,
      skip,
    } of testCases) {
      const testFn = only ? test.only : skip ? test.skip : test

      testFn(input, () => {
        const date = LocalDate.now()
        const userId = '1234' as UserId
        const result = E.runSync(decode({ date, userId, input }))
        Either.match(result, {
          onLeft: e => {
            assert(error, `expected success but got error ${e.message}`)
            expect(e.message).toContain(error)
          },
          onRight: parsedTimeEntry => {
            expect(parsedTimeEntry.project.id).toEqual(projectId)
            // expect(parsedTimeEntry.clientId).toEqual(clientId)
            expect(parsedTimeEntry.description).toEqual('something')
            expect(parsedTimeEntry.duration.minutes).toEqual(duration)
          },
        })
      })
    }

    it('decodes TimeEntry', () => {
      const decoded = TimeEntry.decode({
        userId: '0001',
        date: '2024-06-10',
        duration: 60,
        projectId: '0001',
      })

      // id was populated
      expect(decoded.id).toBeTypeOf('string')
      expect(decoded.id).toHaveLength(24)

      // date was parsed
      expect(decoded.date).toBeInstanceOf(LocalDate)

      // timestamp was populated
      expect(decoded.timestamp).toBeInstanceOf(Date)

      expectTypeOf(decoded).toMatchTypeOf<TimeEntry>()
    })

    it('encodes TimeEntry', () => {
      const decoded = TimeEntry.decode({
        userId: '0001',
        date: '2024-06-10',
        duration: 60,
        projectId: '0001',
      })

      const encoded = TimeEntry.encode(decoded)

      expectTypeOf(encoded).toMatchTypeOf<TimeEntryEncoded>()

      const decodedAgain = TimeEntry.decode(encoded)
      expect(decodedAgain).toEqual(decoded)
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
