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
      { input: '', error: 'NO_PROJECT' }, // empty
      { input: 'Support', error: 'NO_PROJECT' }, // no #
      { input: '#Support', error: 'PROJECT_NOT_FOUND' }, // no subcode
      { input: 'Ongoing', error: 'NO_PROJECT' }, // no #
      { input: '#Supppport: Ongoing', error: 'PROJECT_NOT_FOUND' }, // typo
      { input: '#DevOps: Azure migration', error: 'PROJECT_NOT_FOUND' }, // multiple words need to be separated by dashes
      { input: '#API', error: 'PROJECT_NOT_FOUND' }, // multiple subcode matches
      { input: '#Out #Overhead', error: 'MULTIPLE_PROJECTS' },

      // VALID
      { input: '#Support: Ongoing', id: '051' }, // one space after colon
      { input: '#Support:Ongoing', id: '051' }, // no space
      { input: '#Support:    Ongoing', id: '051' }, // multiple spaces

      { input: '#DevOps: Azure-migration', id: '004' }, // multiple words need to be separated by dashes

      { input: '#Feature: API', id: '009', text: '#Feature: API' },

      { input: '1h #Ongoing', id: '051', text: '#Ongoing' },
      { input: '1h #onGoiNG', id: '051', text: '#onGoiNG' }, // case doesn't matter

      { input: '8h #out vacation day', id: '046', text: '#out' },
    ] as TestCase[],

    decoder: (input: string) =>
      pipe(
        input, //
        ParsedProject.fromInput,
        E.provideService(Projects, TestProjects),
      ),

    validate: (expected, actual) => {
      expect(actual.project.id).toEqual(expected.id)
      if (expected.text) expect(actual.text).toEqual(expected.text)
    },
  })
})

type TestCase = BaseTestCase & {
  id?: string
  text?: string
}
