import { Schema as S } from '@effect/schema'
import { Effect as E, Either, pipe } from 'effect'
import { assert, describe, expect, it, test } from 'vitest'
import { ProjectFromInput, ProjectIdFromCode, Projects, ProjectsProvider } from '../schema/Project'
import { testProjects } from './testProjects'

const TestProjects = new ProjectsProvider(testProjects)

describe('Project', () => {
  describe('ProjectIdFromCode', () => {
    const testCases: TestCase[] = [
      {
        input: '',
        error: 'PROJECT_NOT_FOUND',
      },
      {
        input: 'Support',
        error: 'PROJECT_NOT_FOUND',
      },
      {
        input: 'API',
        error: 'PROJECT_NOT_FOUND',
      },
      {
        input: 'Support: Ongoing',
        projectId: '0005',
      },
      {
        input: 'Ongoing',
        projectId: '0005',
      },
      {
        input: 'out',
        projectId: '0002',
      },
    ]

    const decode = (x: string) =>
      pipe(
        x, //
        S.decode(ProjectIdFromCode),
        E.provideService(Projects, TestProjects),
        E.either,
      )

    for (const { input, error, projectId, only, skip } of testCases) {
      const testFn = only ? test.only : skip ? test.skip : test

      testFn(input, () => {
        const result = E.runSync(decode(input))
        Either.match(result, {
          onLeft: e => {
            assert(error, `expected success but got error ${e.message}`)
            expect(e.message).toContain(error)
          },
          onRight: parsedId => {
            expect(parsedId).toEqual(projectId)
          },
        })
      })
    }
  })

  describe('ProjectFromInput', () => {
    const testCases: TestCase[] = [
      {
        input: '',
        error: 'NO_PROJECT',
      },
      {
        input: 'Support',
        error: 'NO_PROJECT',
      },
      {
        input: '#Support',
        error: 'PROJECT_NOT_FOUND',
      },
      {
        input: '#API',
        error: 'PROJECT_NOT_FOUND',
      },
      {
        input: '#Out  #Overhead', // double spaces between because single space belongs to first word
        error: 'MULTIPLE_PROJECTS',
      },
      {
        input: '#Support: Ongoing',
        projectId: '0005',
        text: '#Support: Ongoing',
      },
      {
        input: '1h #Ongoing',
        projectId: '0005',
        text: '#Ongoing',
      },
      {
        input: '8h #out vacation day',
        projectId: '0002',
        text: '#out',
      },
    ]

    const decode = (x: string) =>
      pipe(
        x, //
        S.decode(ProjectFromInput),
        E.provideService(Projects, TestProjects),
        E.either,
      )

    for (const { input, error, projectId, text, only, skip } of testCases) {
      const testFn = only ? test.only : skip ? test.skip : test

      testFn(input, () => {
        const result = E.runSync(decode(input))
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
