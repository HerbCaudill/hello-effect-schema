import { Schema as S } from '@effect/schema'
import { Effect as E, pipe } from 'effect'
import { describe, expect, it } from 'vitest'
import { ProjectIdFromCode, Projects, ProjectsProvider } from '../schema/Project'
import { testProjects } from './testProjects'

const TestProjects = new ProjectsProvider(testProjects)

describe('Project', () => {
  it('finds project id from code', async () => {
    const decode = (code: string) =>
      pipe(
        code, //
        S.decodeUnknown(ProjectIdFromCode),
        E.provideService(Projects, TestProjects),
      )
    const projectId = E.runSync(decode('out'))
    expect(projectId).toBe('0002')
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
