import { ParseResult, Schema as S } from '@effect/schema'
import { LocalDate } from '@js-joda/core'
import { Context, Effect as E, pipe } from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { ProjectId, TimeEntry, type Project, type TimeEntryEncoded } from './schema'

describe('TimeEntry', () => {
  it('decodes TimeEntry', () => {
    const decoded = TimeEntry.decode({
      userId: '0001',
      date: '2024-06-10',
      duration: 60,
      projectId: '0001',
    })

    // id was populated
    expect(decoded.id).toBeTypeOf('string')
    expect(decoded.id).toHaveLength(24)

    // date was parsed
    expect(decoded.date).toBeInstanceOf(LocalDate)

    // timestamp was populated
    expect(decoded.timestamp).toBeInstanceOf(Date)

    expectTypeOf(decoded).toMatchTypeOf<TimeEntry>()
  })

  it('encodes TimeEntry', () => {
    const decoded = TimeEntry.decode({
      userId: '0001',
      date: '2024-06-10',
      duration: 60,
      projectId: '0001',
    })

    const encoded = TimeEntry.encode(decoded)

    expectTypeOf(encoded).toMatchTypeOf<TimeEntryEncoded>()

    const decodedAgain = TimeEntry.decode(encoded)
    expect(decodedAgain).toEqual(decoded)
  })

  // https://github.com/Effect-TS/effect/blob/main/packages/schema/README.md#declaring-dependencies

  it('decodes using a service provider', async () => {
    /** Give this class a list of projects and you can use it to look up projectIds  */
    class ProjectsProvider {
      constructor(private readonly projects: Project[]) {}
      getByCode = (code: string) => this.projects.find(p => p.code === code)
    }

    /** This defines the tag for the ProjectsProvider */
    class Projects extends Context.Tag('Projects')<Projects, ProjectsProvider>() {}

    /**
     * Takes a code,  gets access to the injected dependency, and uses that to return an
     * effect containing either the corresponding `projectId` or an error
     * */
    const lookupProject = (code: string) =>
      Projects.pipe(
        E.flatMap(projects => {
          const project = projects.getByCode(code)
          return project //
            ? E.succeed(project)
            : E.fail(new Error(`Project with code "${code}" not found`))
        })
      )

    /** Schema for a `projectId` encoded as a `code` */
    const ProjectIdFromCode = S.transformOrFail(S.String, ProjectId, {
      decode: (code, _, ast) => {
        return lookupProject(code).pipe(
          E.mapBoth({
            onFailure: e => new ParseResult.Type(ast, code, e.message),
            onSuccess: p => p.id,
          })
        )
      },
      encode: ParseResult.succeed,
    })

    const TestProjects = new ProjectsProvider([
      { id: '0001', code: 'out' },
      { id: '0002', code: 'overhead' },
      { id: '0003', code: 'security' },
    ] as Project[])

    const decode = (code: string) =>
      pipe(
        code, //
        S.decodeUnknown(ProjectIdFromCode),
        E.provideService(Projects, TestProjects)
      )

    const projectId = E.runSync(decode('out'))
    expect(projectId).toBe('0001')
  })
})
