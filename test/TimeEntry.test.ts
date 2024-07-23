import { Schema as S } from '@effect/schema'
import { LocalDate } from '@js-joda/core'
import { Effect as E, Either, pipe } from 'effect'
import { assert, describe, expect, expectTypeOf, it, test } from 'vitest'
import { Projects, ProjectsProvider } from '../schema/Project'
import {
  ParsedTimeEntry,
  TimeEntry,
  TimeEntryFromInput,
  TimeEntryFromParsedTimeEntry,
  type TimeEntryInput,
} from '../schema/TimeEntry'
import type { UserId } from '../schema/User'
import { testProjects } from './testProjects'

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
      description: 'Ongoing @aba update geography',
    },
  ]

  describe('ParsedTimeEntry from input', () => {
    const decode = (x: TimeEntryInput) =>
      pipe(
        x, //
        S.decode(ParsedTimeEntry),
        E.provideService(Projects, TestProjects),
        E.either,
      )

    for (const { input, error, duration, projectId, only, skip } of testCases) {
      const testFn = only ? test.only : skip ? test.skip : test

      testFn(input, () => {
        const date = LocalDate.now()
        const userId = '1234' as UserId
        const timeEntryInput = { date, userId, input }
        const result = E.runSync(decode(timeEntryInput))
        Either.match(result, {
          onLeft: e => {
            assert(error, `expected success but got error ${e.message}`)
            expect(e.message).toContain(error)
          },
          onRight: parsedTimeEntry => {
            expect(parsedTimeEntry.project.id).toEqual(projectId)
            expect(parsedTimeEntry.duration.minutes).toEqual(duration)
          },
        })
      })
    }
  })

  describe('TimeEntry from ParsedTimeEntry', () => {
    it('decodes ', () => {
      const parsedTimeEntry = {
        userId: '1234' as UserId,
        date: LocalDate.now(),
        input: '1h #Support: ongoing @aba update geography',
        duration: { minutes: 60, text: '1h' },
        project: {
          id: '0005',
          code: 'Support',
          subCode: 'Ongoing',
          description: 'Includes engineering support to individual clients (but not bug fixing)',
        },
      } as ParsedTimeEntry
      const decoded = E.runSync(
        pipe(
          parsedTimeEntry, //
          S.decode(TimeEntryFromParsedTimeEntry),
          E.provideService(Projects, TestProjects),
        ),
      )

      expect(decoded.userId).toEqual('1234')
      expect(decoded.duration).toEqual(60)
      expect(decoded.projectId).toEqual('0005')
    })
  })

  describe('TimeEntry from input', () => {
    const decode = (x: TimeEntryInput) =>
      pipe(
        x, //
        TimeEntryFromInput,
        E.provideService(Projects, TestProjects),
        E.either,
      )

    for (const { input, error, duration, projectId, description, only, skip } of testCases) {
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
          onRight: timeEntry => {
            expect(timeEntry.projectId).toEqual(projectId)
            // expect(parsedTimeEntry.clientId).toEqual(clientId)
            expect(timeEntry.duration).toEqual(duration)
          },
        })
      })
    }
  })

  describe('TimeEntry from serialized TimeEntry', () => {
    const encode = S.encodeSync(TimeEntry)
    const decode = S.decodeSync(TimeEntry)

    it('decodes TimeEntry', () => {
      const serialized = {
        id: '0001',
        userId: '0001',
        date: '2024-06-10',
        duration: 60,
        projectId: '0001',
      }
      const decoded = decode(serialized)

      // date was parsed
      expect(decoded.date).toBeInstanceOf(LocalDate)
      // timestamp was populated
      expect(decoded.timestamp).toBeInstanceOf(Date)
      expectTypeOf(decoded).toMatchTypeOf<TimeEntry>()
    })
    it('encodes TimeEntry', () => {
      const decoded = decode({
        userId: '0001',
        date: '2024-06-10',
        duration: 60,
        projectId: '0001',
      })
      const encoded = encode(decoded)

      const decodedAgain = decode(encoded)
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
