import { Schema as S } from '@effect/schema'
import { Effect as E, pipe } from 'effect'
import { describe, expect, it } from 'vitest'
import { ProjectIdFromCode, Projects, ProjectsProvider, type Project } from '../schema/Project'

/** Instantiated ProjectsProvider with our list of projects */
const TestProjects = new ProjectsProvider([
  { id: '0001', code: 'out' },
  { id: '0002', code: 'overhead' },
  { id: '0003', code: 'security' },
] as Project[])

describe('Project', () => {
  it('decodes using a service provider', async () => {
    // https://github.com/Effect-TS/effect/blob/main/packages/schema/README.md#declaring-dependencies

    const decode = (code: string) =>
      pipe(
        code, //
        S.decodeUnknown(ProjectIdFromCode),
        E.provideService(Projects, TestProjects),
      )

    const projectId = E.runSync(decode('out'))
    expect(projectId).toBe('0001')
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
