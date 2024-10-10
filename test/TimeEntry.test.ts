import { Schema as S } from '@effect/schema'
import { LocalDate } from '@js-joda/core'
import { Effect as E, Either, pipe } from 'effect'
import { assert, describe, expect, test } from 'vitest'
import { Clients, ClientsProvider } from '../schema/Client'
import { Projects, ProjectsProvider } from '../schema/Project'
import { ParsedTimeEntry, type TimeEntryInput } from '../schema/TimeEntry.old'
import type { UserId } from '../schema/User'
import { testClients } from './testClients'
import { testProjects } from './testProjects'
import { ParsedTimeEntryFromInput, TimeEntryFromParsedTimeEntry } from '../schema/TimeEntry'

/** Instantiated ProjectsProvider with our list of projects */

describe('TimeEntry', () => {
  const TestProjects = new ProjectsProvider(testProjects)
  const TestClients = new ClientsProvider(testClients)

  const testCases = [
    { input: '#Support: Ongoing @aba update geography', error: 'NO_DURATION' },
    {
      input: '1h #Support: Ongoing @ABA update geography',
      duration: 60,
      projectId: '0005',
      clientId: '0001',
      description: 'update geography',
    },
  ] as TestCase[]

  describe('ParsedTimeEntry from input', () => {
    const decode = (input: TimeEntryInput) =>
      pipe(
        input, //
        S.decode(ParsedTimeEntryFromInput),
        E.provideService(Projects, TestProjects),
        E.provideService(Clients, TestClients),
        E.either,
      )

    for (const { input, error, duration, projectId, clientId, only, skip } of testCases) {
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
          onRight: parsed => {
            assert(!error, `expected error ${error} but got success`)
            expect(parsed.input).toEqual(input)
            expect(parsed.project.project.id).toEqual(projectId)
            expect(parsed.client.client.id).toEqual(clientId)
            expect(parsed.duration.minutes).toEqual(duration)
            expect(parsed.timestamp).toBeInstanceOf(Date)
          },
        })
      })
    }
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
