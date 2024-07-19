import { Schema as S } from '@effect/schema'
import { LocalDate } from '@js-joda/core'
import { Console, Either, Effect as E, pipe } from 'effect'
import { assert, describe, expect, expectTypeOf, it, test } from 'vitest'
import { Projects, ProjectsProvider } from '../schema/Project'
import {
  ParsedTimeEntryFromInput,
  TimeEntry,
  TimeEntryFromParsedTimeEntry,
  type ParsedTimeEntry,
  type TimeEntryEncoded,
  type TimeEntryInput,
} from '../schema/TimeEntry'
import { testProjects } from './testProjects'
import type { UserId } from '../schema/User'

/** Instantiated ProjectsProvider with our list of projects */

describe('TimeEntry', () => {
  const TestProjects = new ProjectsProvider(testProjects)

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

  describe('ParsedTimeEntryFromInput', () => {
    const decode = (x: TimeEntryInput) =>
      pipe(
        x, //
        S.decode(ParsedTimeEntryFromInput),
        E.provideService(Projects, TestProjects),
        E.either,
      )

    for (const { input, error, duration, projectId, only, skip } of testCases) {
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
            expect(parsedTimeEntry.duration.minutes).toEqual(duration)
          },
        })
      })
    }

    describe('TimeEntryFromParsedTimeEntry', () => {
      const parsedTimeEntry = {
        userId: '1234',
        date: LocalDate.now(),
        input: '1h #Support: Ongoing @aba update geography',
        duration: '', //{ text: '1h', minutes: 60 },
        project: { id: '0005', code: 'Support' },
      }

      it('decodes ', () => {
        const decoded = E.runSync(
          pipe(
            {
              userId: '1234',
              date: LocalDate.now(),
              input: '1h #Support: Ongoing @aba update geography',
              duration: '1h #Support: Ongoing @aba update geography',
              project: '1h #Support: Ongoing @aba update geography',
            },
            S.decode(TimeEntryFromParsedTimeEntry),
            E.provideService(Projects, TestProjects),
          ),
        )

        expect(decoded.userId).toEqual('1234')
        expect(decoded.duration).toEqual(60)
        // {
        // userId: '1234',
        // date: LocalDate.now(),
        // duration: 60,
        // projectId: '0005',
        // clientId: '',
        // description: '#Support: Ongoing @aba update geography',
        // timestamp: expect.any(Date),
      })

      // const decode2 = (x: TimeEntryInput) =>
      //   E.gen(function* () {
      //     const parsedTimeEntry = yield* pipe(
      //       x, //
      //       S.decode(ParsedTimeEntryFromInput),
      //       E.provideService(Projects, TestProjects),
      //     )
      //     return yield* S.decode(TimeEntryFromParsedTimeEntry)(parsedTimeEntry)
      //   })
      // const decode = (x: TimeEntryInput) =>
      //   pipe(
      //     x, //
      //     S.decode(ParsedTimeEntryFromInput),
      //     S.decode(TimeEntryFromParsedTimeEntry),
      //     E.provideService(Projects, TestProjects),
      //     E.either,
      //   )
      // for (const { input, error, duration, projectId, description, only, skip } of testCases) {
      //   const testFn = only ? test.only : skip ? test.skip : test
      //   testFn(input, () => {
      //     const date = LocalDate.now()
      //     const userId = '1234' as UserId
      //     const result = E.runSync(decode({ date, userId, input }))
      //     Either.match(result, {
      //       onLeft: e => {
      //         assert(error, `expected success but got error ${e.message}`)
      //         expect(e.message).toContain(error)
      //       },
      //       onRight: timeEntry => {
      //         expect(timeEntry.projectId).toEqual(projectId)
      //         // expect(parsedTimeEntry.clientId).toEqual(clientId)
      //         expect(timeEntry.duration).toEqual(duration)
      //       },
      //     })
      //   })
      // }
    })

    describe('TimeEntry', () => {
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
