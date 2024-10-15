import { LocalDate } from '@js-joda/core'
import { Effect as E, pipe } from 'effect'
import { describe } from 'vitest'
import { Clients, ClientsProvider } from '../schema/Client'
import { Projects, ProjectsProvider } from '../schema/Project'
import { TimeEntry } from '../schema/TimeEntry'
import type { UserId } from '../schema/User'
import { runTestCases, type BaseTestCase } from './lib/runTestCases'
import { testClients } from './testClients'
import { testProjects } from './testProjects'

describe('TimeEntry', () => {
  const TestProjects = new ProjectsProvider(testProjects)
  const TestClients = new ClientsProvider(testClients)

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
      input: '#out 1:15',
      duration: 75,
      projectId: '0002',
      description: '',
    },
    {
      input: '#out 1:15 doctor',
      duration: 75,
      projectId: '0002',
      description: 'doctor',
    },
    {
      input: '1h #Support: Ongoing @ABA update geography',
      duration: 60,
      projectId: '0005',
      clientId: '0001',
      description: 'update geography',
    },
  ] as TestCase[]

  runTestCases({
    testCases,
    decoder: (input: string) =>
      pipe(
        input, //
        input => ({
          userId: '1234' as UserId,
          date: LocalDate.now(),
          input,
        }),
        TimeEntry.fromInput,
        E.provideService(Projects, TestProjects),
        E.provideService(Clients, TestClients),
      ),
    mapResult: result => ({
      ...result,
      projectId: result.project.id,
      clientId: result.client?.id,
    }),
  })
})

type TestCase = BaseTestCase & {
  duration?: number
  projectId?: string
  clientId?: string
  description?: string
}

// ADDITIONAL VALIDATORS

// expect(parsed.id).toBeTypeOf('string')
// expect(parsed.input).toEqual(input)

// if (clientId) {
//   expect(parsed.client?.id).toEqual(clientId)
// } else {
//   expect(parsed.client).toBeUndefined()
// }

// expect(parsed.timestamp).toBeInstanceOf(Date)
