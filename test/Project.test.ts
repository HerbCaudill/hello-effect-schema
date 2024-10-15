import { Effect as E, pipe } from 'effect'
import { describe } from 'vitest'
import { ParsedProject, Projects, ProjectsProvider } from '../schema/Project'
import { runTestCases, type BaseTestCase } from './lib/runTestCases'
import { testProjects } from './lib/testProjects'

describe('Project', () => {
  const TestProjects = new ProjectsProvider(testProjects)

  runTestCases({
    testCases: [
      // INVALID
      { input: '', error: 'NO_PROJECT' },
      { input: 'Support', error: 'NO_PROJECT' },
      { input: '#Support', error: 'PROJECT_NOT_FOUND' },
      { input: '#API', error: 'PROJECT_NOT_FOUND' },
      { input: '#Out #Overhead', error: 'MULTIPLE_PROJECTS' },

      // VALID
      { input: '#Support: Ongoing', id: '0005', text: '#Support: Ongoing' },
      { input: '1h #Ongoing', id: '0005', text: '#Ongoing' },
      { input: '8h #out vacation day', id: '0002', text: '#out' },
    ] as TestCase[],
    decoder: (input: string) =>
      pipe(
        input, //
        ParsedProject.fromInput,
        E.provideService(Projects, TestProjects),
      ),
    mapResult: result => ({
      id: result.project.id,
      text: result.text,
    }),
  })
})

type TestCase = BaseTestCase & {
  id?: string
  text?: string
}
