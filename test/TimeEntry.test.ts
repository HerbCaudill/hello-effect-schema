import { LocalDate } from '@js-joda/core'
import { Effect as E, pipe } from 'effect'
import { describe, expect } from 'vitest'
import { Clients, ClientsProvider } from '../schema/Client'
import { Projects, ProjectsProvider } from '../schema/Project'
import { TimeEntry } from '../schema/TimeEntry'
import type { UserId } from '../schema/User'
import { runTestCases, type BaseTestCase } from './lib/runTestCases'
import { testClients } from './data/clients'
import { projects } from './data/projects'

describe('TimeEntry', () => {
  const TestProjects = new ProjectsProvider(projects)
  const TestClients = new ClientsProvider(testClients)

  const testCases = [
    // failure
    { input: '#Support: Ongoing @aba ', error: 'NO_DURATION' },
    { input: '1h 30mn #Support: Ongoing @aba', error: 'MULTIPLE_DURATIONS' },
    { input: '1h', error: 'NO_PROJECT' },
    { input: '1h #API', error: 'PROJECT_NOT_FOUND' },
    { input: '1h #Out #Overhead', error: 'MULTIPLE_PROJECTS' },
    { input: '1h #Support: Ongoing @aba @chemonics', error: 'MULTIPLE_CLIENTS' },

    // success
    {
      input: '#out 1:15',
      duration: 75,
      projectId: '046',
      description: '',
    },
    {
      input: '#out 1:15 doctor',
      duration: 75,
      projectId: '046',
      description: 'doctor',
    },
    {
      input: '1h #Support: Ongoing @ABA update geography',
      duration: 60,
      projectId: '051',
      clientId: '001',
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
    validate: (expected, actual) => {
      expect(actual.id).toBeTypeOf('string')
      expect(actual.input).toEqual(expected.input)
      expect(actual.duration).toEqual(expected.duration)
      expect(actual.project.id).toEqual(expected.projectId)
      if (expected.clientId) {
        expect(actual.client!.id).toEqual(expected.clientId)
      } else {
        expect(actual.client).toBeUndefined()
      }
      expect(actual.timestamp).toBeInstanceOf(Date)
    },
  })
})

type TestCase = BaseTestCase & {
  duration?: number
  projectId?: string
  clientId?: string
  description?: string
}
