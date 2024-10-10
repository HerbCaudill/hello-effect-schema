import { Schema as S } from '@effect/schema'
import { LocalDate } from '@js-joda/core'
import { Effect as E, Either, pipe } from 'effect'
import { assert, describe, expect, expectTypeOf, it, test } from 'vitest'
import { Clients, ClientsProvider } from '../schema/Client'
import { Projects, ProjectsProvider } from '../schema/Project'
import { TimeEntry, type TimeEntryInput, ParsedTimeEntryFromInput } from '../schema/TimeEntry.old'
import type { UserId } from '../schema/User'
import { testClients } from './testClients'
import { testProjects } from './testProjects'

/** Instantiated ProjectsProvider with our list of projects */

describe.skip('TimeEntry', () => {
  const TestClients = new ClientsProvider(testClients)
  const TestProjects = new ProjectsProvider(testProjects)

  const testCases = [
    {
      input: '#Support: Ongoing @aba update geography',
      error: 'NO_DURATION',
    },

    {
      input: '1h #Support: Ongoing @ABA update geography',
      duration: 60,
      projectId: '0005',
      clientId: '0001',
      description: 'update geography',
    },
  ] as TestCase[]

  describe('ParsedTimeEntry from input', () => {
    const decode = (x: TimeEntryInput) =>
      pipe(
        x, //
        S.decode(ParsedTimeEntryFromInput),
        E.provideService(Clients, TestClients),
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
            expect(parsedTimeEntry.input).toEqual(input)
            expect(parsedTimeEntry.project.project.id).toEqual(projectId)
            expect(parsedTimeEntry.duration.minutes).toEqual(duration)
          },
        })
      })
    }
  })

  describe.skip('TimeEntry from input', () => {
    const decode = (x: TimeEntryInput) =>
      pipe(
        x, //
        TimeEntryFromInput,
        S.decode(TimeEntryFromInput),
        E.provideService(Clients, TestClients),
        E.provideService(ProjectsDependency, TestProjects),
        E.either,
      )

    for (const {
      input,
      error,
      duration,
      projectId,
      clientId,
      description,
      only,
      skip,
    } of testCases) {
      const testFn = only ? test.only : skip ? test.skip : test
      testFn(input, () => {
        const date = LocalDate.now()
        const userId = '1234' as UserId
        const result = E.runSync(decode({ date, userId, input }))
        // console.log({ result })
        Either.match(result, {
          onLeft: e => {
            // console.log({ e })
            assert(error, `expected success but got error ${e.message}`)
            expect(e.message).toContain(error)
          },
          onRight: timeEntry => {
            expect(timeEntry.input).toEqual(input)
            expect(timeEntry.projectId).toEqual(projectId)
            expect(timeEntry.clientId).toEqual(clientId)
            expect(timeEntry.duration).toEqual(duration)
            expect(timeEntry.description).toEqual(description)
          },
        })
      })
    }
  })

  describe.skip('TimeEntry from serialized TimeEntry', () => {
    const encode = S.encodeSync(TimeEntry)
    const decode = S.decodeSync(TimeEntry)

    it('decodes TimeEntry', () => {
      const serialized = {
        id: '0001',
        userId: '0001',
        date: '2024-06-10',
        duration: 60,
        projectId: '0001',
        clientId: '0001',
        input: '1h #overhead did stuff',
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
        clientId: '0001',
        input: '1h #overhead did stuff',
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
