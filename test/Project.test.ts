import { Effect as E, pipe } from 'effect'
import { describe, expect } from 'vitest'
import { ParsedProject, Projects, ProjectsProvider } from '../schema/Project'
import { runTestCases, type BaseTestCase } from './lib/runTestCases'
import { projects } from './data/projects'

describe('Project', () => {
  const TestProjects = new ProjectsProvider(projects)

  runTestCases({
    testCases: [
      // INVALID
      { input: '', error: 'NO_PROJECT' },
      { input: 'Support', error: 'NO_PROJECT' },
      { input: '#Support', error: 'PROJECT_NOT_FOUND' },
      { input: 'Ongoing', error: 'NO_PROJECT' },
      { input: '#API', error: 'PROJECT_NOT_FOUND' },
      { input: '#Out #Overhead', error: 'MULTIPLE_PROJECTS' },

      // VALID
      { input: '#Support: Ongoing', id: '051', text: '#Support: Ongoing' }, // one space after colon
      { input: '#Support:Ongoing', id: '051', text: '#Support:Ongoing' }, // no space
      { input: '#Support:    Ongoing', id: '051', text: '#Support:    Ongoing' }, // multiple spaces

      { input: '1h #Ongoing', id: '051', text: '#Ongoing' },
      { input: '1h #onGoiNG', id: '051', text: '#onGoiNG' }, // case doesn't matter
      { input: '8h #out vacation day', id: '046', text: '#out' },
      { input: '#Feature: API', id: '009', text: '#Feature: API' },
    ] as TestCase[],

    decoder: (input: string) =>
      pipe(
        input, //
        ParsedProject.fromInput,
        E.provideService(Projects, TestProjects),
      ),

    validate: (expected, actual) => {
      expect(actual.project.id).toEqual(expected.id)
      expect(actual.text).toEqual(expected.text)
    },
  })
})

type TestCase = BaseTestCase & {
  id?: string
  text?: string
}
