import { Effect as E, Either, pipe } from 'effect'
import { test as _test, assert, describe, expect } from 'vitest'
import { ParsedProject, Projects, ProjectsProvider } from '../schema/Project'
import { testProjects } from './testProjects'

describe('Project', () => {
  const TestProjects = new ProjectsProvider(testProjects)

  describe('from input', () => {
    const testCases = [
      // failure
      { input: '', error: 'NO_PROJECT' },
      { input: 'Support', error: 'NO_PROJECT' },
      { input: '#Support', error: 'PROJECT_NOT_FOUND' },
      { input: '#API', error: 'PROJECT_NOT_FOUND' },
      { input: '#Out #Overhead', error: 'MULTIPLE_PROJECTS' },

      // success
      { input: '#Support: Ongoing', projectId: '0005', text: '#Support: Ongoing' },
      { input: '1h #Ongoing', projectId: '0005', text: '#Ongoing' },
      { input: '8h #out vacation day', projectId: '0002', text: '#out' },
    ]

    const decode = (input: string) =>
      pipe(
        input, //
        ParsedProject.fromInput,
        E.provideService(Projects, TestProjects),
        E.either,
        E.runSync,
      )

    for (const { input, error, projectId, text, only, skip } of testCases) {
      const test = only ? _test.only : skip ? _test.skip : _test

      test(input, () => {
        const result = decode(input)
        Either.match(result, {
          onLeft: e => {
            assert(error, `expected success but got error ${e.message}`)
            expect(e.message).toContain(error)
          },
          onRight: parsedProject => {
            expect(parsedProject.project.id).toEqual(projectId)
            expect(parsedProject.text).toEqual(text)
          },
        })
      })
    }
  })
})

type TestCase = {
  input: string
  error?: string
  projectId?: string
  text?: string
  only?: boolean
  skip?: boolean
}

const only = true
const skip = true
