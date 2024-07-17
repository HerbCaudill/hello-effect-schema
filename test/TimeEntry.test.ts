import { Schema as S } from '@effect/schema'
import { LocalDate } from '@js-joda/core'
import { Effect as E, Either, pipe } from 'effect'
import { assert, describe, expect, expectTypeOf, it, test } from 'vitest'
import { ProjectIdFromCode, Projects, ProjectsProvider, type Project } from '../schema/Project'
import { TimeEntry, TimeEntryFromString, type TimeEntryEncoded } from '../schema/TimeEntry'

describe('TimeEntry', () => {
  describe('TimeEntryFromString', () => {
    const decode = S.decodeEither(TimeEntryFromString)

    const testCases: TestCase[] = [
      {
        input: '#Support: Ongoing @aba update geography',
        error: 'NO_DURATION',
      },
      {
        input: '1h #Support: Ongoing @aba update geography',
        duration: 60,
        projectId: '',
        clientId: '',
        description: '#Support: Ongoing @aba update geography', // needs whittled down as we parse and remove things
      },
    ]

    for (const {
      input,
      error,
      duration,
      clientId,
      projectId,
      description,
      only,
      skip,
    } of testCases) {
      const testFn = only ? test.only : skip ? test.skip : test

      testFn(input, () => {
        const result = decode(input)
        if (Either.isLeft(result)) {
          // @ts-ignore result.left.error.error wtf
          assert(error, `expected success but got error ${result.left.error.error.message.value}`)

          // @ts-ignore
          expect(result.left.error.error.message.value).toBe(error) // <- wtf
        } else {
          assert(!error, `expected error ${error}`)

          const parseResult = result.right
          // expect(parseResult.projectId).toEqual(projectId)
          // expect(parseResult.clientId).toEqual(clientId)
          expect(parseResult.description).toEqual(description)
          expect(parseResult.duration).toEqual(duration)
        }
      })
    }
  })

  it('decodes TimeEntry', () => {
    const decoded = TimeEntry.decode({
      originalText: '',
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
      originalText: '',
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
