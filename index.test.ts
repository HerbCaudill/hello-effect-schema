import { ParseResult, Schema as S, TreeFormatter } from '@effect/schema'
import { LocalDate } from '@js-joda/core'
import { Context, Effect as E, Either, Layer, pipe } from 'effect'
import { assert, describe, expect, expectTypeOf, it } from 'vitest'

describe('Schema', () => {
  describe('Validation', () => {
    it('confirms that a given value _is already_ of the desired type', () => {
      const schema = S.Date
      const validate = S.validateSync(schema)

      // I use this to confirm that a value is already the target type
      const d = new Date('2024-06-11')
      expect(validate(d)).toBe(d)

      // If it's not, an error is thrown
      expect(() => validate({ 'this is not': 'a date' })).toThrow()

      // this doesn't work the way I thought, which that you'd use it to tell whether something could be decoded:
      // expect(validate('1970-01-01T00:00:00.000Z')).toEqual(true)

      // I think the way to actually validate is just to try to decode
      const decode = S.decodeUnknownSync(schema)
      expect(decode('2024-06-11')).toBeInstanceOf(Date)
      expect(() => decode('asdf')).toThrow()
    })
  })

  describe('Error handling', () => {
    it('"safe" error handling using `Either`', () => {
      const decode = S.decodeUnknownEither(S.DateFromString)
      const result = decode(-1234)
      assert(Either.isLeft(result))
      expect(result.left).toMatchInlineSnapshot(`
          [ParseError: DateFromString
          └─ Encoded side transformation failure
             └─ Expected a string, actual -1234]
        `)
    })
  })

  describe('Struct schema', () => {
    const Person = S.Struct({
      name: S.String,
      age: S.NumberFromString,
    })
    type Person = typeof Person.Type

    const alice1: Person = {
      name: 'alice',
      // @ts-expect-error
      age: 'forty-two',
      // ~~ Type 'string' is not assignable to 'number'
    }

    const alice2: Person = {
      name: 'alice',
      age: 42,
      // @ts-expect-error
      foo: 'pizza',
      // ~~ 'foo' does not exist in type 'Person'
    }

    const p = {
      name: 'Alice',
      age: 42,
    } satisfies Person

    const p2 = {
      name: 'Bob',
      //@ts-expect-error
      age: '35',
      //   ~~~~ Type 'string' is not assignable to 'number'
    } satisfies Person

    type PersonEncoded = typeof Person.Encoded

    const p3: PersonEncoded = {
      name: 'Alice',
      age: '42', // ok
    }

    const p4: PersonEncoded = {
      name: 'Bob',
      //@ts-expect-error
      age: 35,
      //   ~~ Type 'number' is not assignable to 'string'
    }

    it('decodes Person', () => {
      const decode = S.decodeSync(Person)
      const result = decode({
        name: 'Alice',
        age: '42', // <- string
      })

      expect(result).toEqual({
        name: 'Alice',
        age: 42, // <- number
      })

      expectTypeOf(result).toMatchTypeOf<Person>()
      expectTypeOf(result.age).toMatchTypeOf<number>()
    })

    it('encodes Person', () => {
      const encode = S.encodeSync(Person)
      const result = encode({
        name: 'Alice',
        age: 42, // <- number
      })

      expect(result).toEqual({
        name: 'Alice',
        age: '42', // <- string
      })

      expectTypeOf(result).toMatchTypeOf<PersonEncoded>()
      expectTypeOf(result.age).toMatchTypeOf<string>()
    })

    it('ignores excess properties in the input', () => {
      const encode = S.encodeSync(Person)
      const result = encode({
        name: 'Alice',
        age: 42,
        //@ts-expect-error
        foo: 'bar', // <- excess
      })

      // The excess property is omitted from the result
      expect(result).toEqual({
        name: 'Alice',
        age: '42',
      })
      expect('foo' in result).toBe(false)
    })

    it('does not encode invalid person', () => {
      const encode = S.encodeSync(Person)
      expect(() =>
        encode({
          //@ts-expect-error
          foo: 'bar',
        })
      ).toThrow(/"name".*is missing/s)
    })
  })

  describe('Class schema', () => {
    class Person extends S.Class<Person>('Person')({
      name: S.String,
      age: S.NumberFromString,
    }) {}

    type PersonEncoded = typeof Person.Encoded

    it('decodes Person', () => {
      const decode = S.decodeSync(Person)
      const result = decode({
        name: 'Alice',
        age: '42', // <- string
      })

      expect(result).toEqual({
        name: 'Alice',
        age: 42, // <- number
      })

      expectTypeOf(result).toMatchTypeOf<Person>()
      expectTypeOf(result.age).toMatchTypeOf<number>()
    })

    it('encodes Person', () => {
      const encode = S.encodeSync(Person)
      const result = encode({
        name: 'Alice',
        age: 42, // <- number
      })

      expect(result).toEqual({
        name: 'Alice',
        age: '42', // <- string
      })

      expectTypeOf(result).toMatchTypeOf<PersonEncoded>()
      expectTypeOf(result.age).toMatchTypeOf<string>()
    })

    it('ignores excess properties in the input', () => {
      const encode = S.encodeSync(Person)
      const result = encode({
        name: 'Alice',
        age: 42,
        //@ts-expect-error
        foo: 'bar', // <- excess
      })

      expect(result).toEqual({
        name: 'Alice',
        age: '42',
      })
    })

    it('does not encode invalid person', () => {
      const encode = S.encodeSync(Person)
      expect(() =>
        encode({
          //@ts-expect-error
          foo: 'bar',
        })
      ).toThrow(/"name".*is missing/s)
    })
  })

  describe('TimeEntry', () => {
    const isLocalDate = (input: unknown): input is LocalDate => input instanceof LocalDate
    const LocalDateSchema = S.declare(isLocalDate)
    const LocalDateFromString = S.transformOrFail(
      S.String, // source
      LocalDateSchema, // target
      {
        decode: (s, options, ast) => {
          try {
            const parsed = LocalDate.parse(s)
            return ParseResult.succeed(parsed)
          } catch (e) {
            return ParseResult.fail(new ParseResult.Type(ast, s, `string could not be parsed as LocalDate`))
          }
        },
        encode: d => ParseResult.succeed(d.toString()),
      }
    )

    // Cuid is a branded String
    const Cuid = pipe(S.String, S.brand('Cuid')) //, S.pattern(/^[a-z0-9]{24}$/))
    type Cuid = typeof Cuid.Type

    // different IDs are branded Cuids

    const TimeEntryId = pipe(Cuid, S.brand('TimeEntryId'))
    type TimeEntryId = typeof TimeEntryId.Type

    const UserId = pipe(Cuid, S.brand('UserId'))
    type UserId = typeof UserId.Type

    const ProjectId = pipe(Cuid, S.brand('ProjectId'))
    type ProjectId = typeof ProjectId.Type

    type Project = { id: ProjectId; code: string }

    const TimeEntry = S.Struct({
      id: TimeEntryId,
      userId: UserId,
      date: LocalDateFromString,
    })
    type TimeEntry = typeof TimeEntry.Type

    describe('encode/decode LocalDate', () => {
      // LocalDate schema

      it('decodes string to LocalDate', () => {
        const decode = S.decodeSync(LocalDateFromString)
        const result = decode('2024-06-10')
        expect(result.year()).toBe(2024)
      })

      it('encodes LocalDate to string', () => {
        const encode = S.encodeSync(LocalDateFromString)
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

    it('validate LocalDate', () => {
      const validate = S.validateSync(LocalDateFromString)
      const d = LocalDate.parse('2024-06-10')
      expect(validate(d)).toEqual(d)

      expect(() => validate('foo')).toThrow()
    })

    describe('encode/decode TimeEntry', () => {
      it('decodes TimeEntry', () => {
        const e = {
          id: 'pfh0haxfpzowht3oi213cqos',
          userId: 'tz4a98xxat96iws9zmbrgj3a',
          date: LocalDate.parse('2024-06-10'),
        }

        const decode = S.decodeSync(TimeEntry)
        const result = decode({
          id: 'pfh0haxfpzowht3oi213cqos',
          userId: 'tz4a98xxat96iws9zmbrgj3a',
          date: '2024-06-10',
        })

        expect(result).toEqual(e)

        expectTypeOf(result).toMatchTypeOf<TimeEntry>()
      })

      it('can roundtrip decode->encode->decode', () => {
        const encoded = {
          id: 'pfh0haxfpzowht3oi213cqos',
          userId: 'tz4a98xxat96iws9zmbrgj3a',
          date: '2024-06-10',
        }

        const encode = S.encodeSync(TimeEntry)
        const decode = S.decodeSync(TimeEntry)

        expect(encode(decode(encoded))).toEqual(encoded)
      })

      it('can roundtrip encode->decode->encode', () => {
        const decoded = {
          id: 'pfh0haxfpzowht3oi213cqos' as TimeEntryId,
          userId: 'tz4a98xxat96iws9zmbrgj3a' as UserId,
          date: LocalDate.parse('2024-06-10'),
        }

        const encode = S.encodeSync(TimeEntry)
        const decode = S.decodeSync(TimeEntry)

        expect(decode(encode(decoded))).toEqual(decoded)
      })

      it('does not decode invalid TimeEntry', () => {
        const decode = S.decodeUnknownSync(TimeEntry)

        expect(() => decode({ foo: 'bar' })).toThrow(/"id".*missing/s)
      })

      it('does not decode TimeEntry with invalid date', () => {
        const decode = S.decodeUnknownSync(TimeEntry)
        expect(() =>
          decode({
            id: 'pfh0haxfpzowht3oi213cqos',
            userId: 'tz4a98xxat96iws9zmbrgj3a',
            date: 'asdf',
          })
        ).toThrow(/string could not be parsed as LocalDate/i)
      })

      it('does not decode TimeEntry with invalid cuid', () => {
        const decode = S.decodeUnknownSync(TimeEntry)
        expect(() =>
          decode({
            id: 'asdf',
            userId: 'tz4a98xxat96iws9zmbrgj3a',
            date: '2024-06-11',
          })
        ).toThrow(/expected a string matching the pattern/i)
      })

      it('enforces ID types', () => {
        const foo = pipe(
          {
            id: 'pfh0haxfpzowht3oi213cqos',
            userId: 'tz4a98xxat96iws9zmbrgj3a',
            date: '2024-06-10',
          },
          S.decodeUnknownSync(TimeEntry)
        )

        //@ts-expect-error (TimeEntryId is not assignable to UserId)
        const userId: UserId = foo.id
      })
    })

    describe('Default values', () => {
      describe('using `S.optional` with `{default: ...}`', () => {
        const TimeEntry = S.Struct({
          id: TimeEntryId,
          userId: UserId,
          date: LocalDateFromString,
          timestamp: S.optional(S.DateFromNumber, { default: () => new Date() }),
        })
        type TimeEntry = typeof TimeEntry.Type

        it('decodes TimeEntry with default timestamp', () => {
          const decode = S.decodeSync(TimeEntry)
          const result = decode({
            id: 'pfh0haxfpzowht3oi213cqos',
            userId: 'tz4a98xxat96iws9zmbrgj3a',
            date: '2024-06-10',
          })

          // the current Date is automatically added
          expect(result.timestamp).toBeInstanceOf(Date)

          // when encoded, the timestamp is encoded as a number (UNIX timestamp)
          const encoded = pipe(result, S.encodeSync(TimeEntry))
          expect(encoded.timestamp).toBeTypeOf('number')
        })

        it('constructs TimeEntry with default timestamp', () => {
          const entry = TimeEntry.make({
            id: 'pfh0haxfpzowht3oi213cqos' as TimeEntryId,
            userId: 'tz4a98xxat96iws9zmbrgj3a' as UserId,
            date: LocalDate.now(),
          })

          expect(entry.timestamp).toBeInstanceOf(Date)
        })
      })
    })

    describe('With dependencies', () => {
      // https://github.com/Effect-TS/effect/blob/main/packages/schema/README.md#declaring-dependencies

      it.only('decodes using a service provider', async () => {
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
          encode: ParseResult.succeed, // unclear on this - presumably we'd want this to work in the opposite direction as well?
        })

        const TestProjects = new ProjectsProvider([
          { id: '0002', code: 'out' },
          { id: '0003', code: 'overhead' },
          { id: '0004', code: 'security' },
        ] as Project[])

        const decode = (code: string) =>
          pipe(
            code,
            S.decodeUnknown(ProjectIdFromCode),
            E.provideService(Projects, TestProjects)
            // E.mapError(e => TreeFormatter.formatError(e))
          )

        const projectId = E.runSync(decode('out'))
        expect(projectId).toBe('0002')
      })
    })
  })
})
