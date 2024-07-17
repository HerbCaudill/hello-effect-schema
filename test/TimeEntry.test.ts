import { Schema as S } from '@effect/schema'
import { LocalDate } from '@js-joda/core'
import { Effect as E, pipe } from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { ProjectIdFromCode, Projects, ProjectsProvider, type Project } from '../schema/Project'
import { TimeEntry, type TimeEntryEncoded } from '../schema/TimeEntry'

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

  it('decodes using a service provider', async () => {
    // https://github.com/Effect-TS/effect/blob/main/packages/schema/README.md#declaring-dependencies

    /** Instantiated ProjectsProvider with our list of projects */
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
