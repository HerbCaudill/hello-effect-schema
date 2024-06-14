import { ParseResult, Schema as S, TreeFormatter } from '@effect/schema'
import { LocalDate } from '@js-joda/core'
import { Context, Effect as E, Either, Layer, pipe } from 'effect'
import { assert, describe, expect, expectTypeOf, it } from 'vitest'
import { createId as _createId } from '@paralleldrive/cuid2'

// LocalDate
const isLocalDate = (x: unknown): x is LocalDate => x instanceof LocalDate
const LocalDateSchema = S.declare(isLocalDate)
const LocalDateFromString = S.transformOrFail(
  S.String, // source
  LocalDateSchema, // target
  {
    decode: (s, options, ast) => {
      try {
        return ParseResult.succeed(LocalDate.parse(s))
      } catch (e) {
        return ParseResult.fail(new ParseResult.Type(ast, s, `string could not be parsed as LocalDate`))
      }
    },
    encode: d => ParseResult.succeed(d.toString()),
  }
)

const Cuid = pipe(S.String, S.brand('Cuid'))
type Cuid = typeof Cuid.Type
const createId = () => _createId() as Cuid

const UserId = pipe(Cuid, S.brand('UserId'))
type UserId = typeof UserId.Type

const TimeEntryId = pipe(Cuid, S.brand('TimeEntryId'))
type TimeEntryId = typeof TimeEntryId.Type

// Projects

const ProjectId = pipe(Cuid, S.brand('ProjectId'))
type ProjectId = typeof ProjectId.Type

type Project = { id: ProjectId; code: string }

// TimeEntry

class TimeEntry extends S.Class<TimeEntry>('TimeEntry')({
  id: S.optional(TimeEntryId, { default: () => createId() as TimeEntryId }),
  // userId: UserId,
  date: LocalDateFromString,
  // duration: S.Number,
  projectId: ProjectId,
  // clientId: S.optional(ProjectId),
  // description: S.optional(S.String),
  timestamp: S.optional(S.DateFromNumber, { default: () => new Date() }),
}) {
  static decode = S.decodeSync(TimeEntry)
  static encode = S.encodeSync(TimeEntry)
}
type TimeEntryEncoded = typeof TimeEntry.Encoded

describe('LocalDate', () => {
  const encode = S.encodeSync(LocalDateFromString)
  const decode = S.decodeSync(LocalDateFromString)

  it('decodes string to LocalDate', () => {
    const result = decode('2024-06-10')
    expect(result.year()).toBe(2024)
  })

  it('encodes LocalDate to string', () => {
    const today = LocalDate.parse('2024-06-10')
    const result = encode(today)
    expect(result).toBe('2024-06-10')
  })

  it('does not decode invalid LocalDate', () => {
    const decode = S.decodeUnknownSync(LocalDateFromString)
    expect(() => decode('foo')).toThrow(/string could not be parsed as LocalDate/)
  })

  it('"safe" error handling using `Either`', () => {
    const decode = S.decodeUnknownEither(LocalDateFromString)
    const result = decode('foo')
    assert(Either.isLeft(result))
    expect(result.left).toMatchInlineSnapshot(`
      [ParseError: (string <-> <declaration schema>)
      └─ Transformation process failure
         └─ string could not be parsed as LocalDate]
    `)
  })
})

describe('TimeEntry', () => {
  it('decodes TimeEntry', () => {
    const decoded = TimeEntry.decode({
      date: '2024-06-10',
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
      date: '2024-06-10',
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

    /** This defines the tag for the ProjectsProvider (not really sure what it's for) */
    class Projects extends Context.Tag('Projects')<Projects, ProjectsProvider>() {}

    /** Takes a code, somehow gets access to the injected dependency, and uses that to return an
     * effect containing either the corresponding `projectId` or an error  */
    const lookupProject = (code: string): E.Effect<Project, Error, Projects> =>
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
