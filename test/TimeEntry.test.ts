import { LocalDate } from '@js-joda/core'
import { Effect as E, Either, pipe } from 'effect'
import { assert, describe, expect, test } from 'vitest'
import { Clients, ClientsProvider } from '../schema/Client'
import { Projects, ProjectsProvider } from '../schema/Project'
import { TimeEntry, type TimeEntryInput } from '../schema/TimeEntry'
import type { UserId } from '../schema/User'
import { testClients } from './testClients'
import { testProjects } from './testProjects'

/** Instantiated ProjectsProvider with our list of projects */

describe('TimeEntry', () => {
  const TestProjects = new ProjectsProvider(testProjects)
  const TestClients = new ClientsProvider(testClients)

  describe('from input', () => {
    const testCases = [
      // failure
      {
        input: '#Support: Ongoing @aba update geography',
        error: 'NO_DURATION',
      },
      {
        input: '1h 30mn #Support: Ongoing @aba update geography',
        error: 'MULTIPLE_DURATIONS',
      },

      // success
      {
        input: '1h #Support: Ongoing @ABA update geography',
        duration: 60,
        projectId: '0005',
        clientId: '0001',
        description: 'update geography',
      },
    ] as TestCase[]

    const decode = (input: TimeEntryInput) =>
      pipe(
        input, //
        TimeEntry.fromInput,
        E.provideService(Projects, TestProjects),
        E.provideService(Clients, TestClients),
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
        Either.match(result, {
          onLeft: e => {
            assert(error, `expected success but got error ${e.message}`)
            expect(e.message).toContain(error)
          },
          onRight: parsed => {
            assert(!error, `expected error ${error} but got success`)
            expect(parsed.input).toEqual(input)
            expect(parsed.project.id).toEqual(projectId)
            expect(parsed.client!.id).toEqual(clientId)
            expect(parsed.duration).toEqual(duration)
            expect(parsed.description).toEqual(description)
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
