import { ParseResult, Schema as S } from '@effect/schema'
import { LocalDate } from '@js-joda/core'
import { Either } from 'effect'
import { assert, expect, test } from 'vitest'
import { LocalDateFromString, LocalDateSchema } from '../schema/LocalDate'

// In the hours app, unstructured text input into a calendar gets parsed into time entries. For
// example, if I enter `#overhead 1hr staff meeting` on a given day, the object we start with might
// look like this:

const timeEntryInput = {
  userId: '123',
  date: LocalDate.parse('2024-10-10'),
  input: `#overhead 1hr staff meeting`,
}

// After parsing etc., the data I persist would look something like this:

const encodedTimeEntry = {
  id: 'abc',
  userId: '123',
  date: '2024-10-10',
  input: `#overhead 1hr staff meeting`,
  duration: 60,
  projectId: 101,
  description: 'staff meeting',
}

// While the fully hydrated form in memory might be this:

const timeEntry = {
  id: '001',
  user: {
    userId: '123',
    name: 'Herb',
  },
  date: LocalDate.parse('2024-10-10'),
  input: `#overhead 1hr staff meeting`,
  duration: 60, // minutes
  project: {
    projectId: '101',
    code: 'overhead',
    description: 'General meetings, company process, HR, etc.',
  },
  description: 'staff meeting',
}

// To extract the duration from the input, I can write a parser as a transformation from string to
// number:

const DurationFromInput = S.transformOrFail(S.String, S.Number, {
  strict: true,
  decode: (input, _, ast) => {
    const fail = (message: string) => ParseResult.fail(new ParseResult.Type(ast, input, message))

    const formats = [
      // 1:15, :15
      /^(?<text>(?<hrs>\d+)?:(?<mins>\d+))$/i,
      // 1h, 2hrs, 1h45, 1h45m
      /^(?<text>(?<hrs>\d+)(hrs|hr|h)((?<mins>\d+)(mins|min|m)?)?)$/i,
      // 45m, 45min
      /^(?<text>(?<mins>\d+)(mins|min|m))$/i,
      // 2.15, .25, 2.15hrs
      /^(?<text>(?<hrsDecimal>\d*\.\d+)(hrs|hr|h)?)$/i,
    ]

    let result: number | undefined

    for (const word of input.split(/\s+/)) {
      for (const format of formats) {
        const match = word.match(format)
        if (match) {
          const { text, hrs = '0', mins = '0', hrsDecimal } = match.groups!
          const minutes = hrsDecimal
            ? Math.round(Number(hrsDecimal) * 60) // decimal
            : Number(hrs) * 60 + Number(mins) // hours+minutes

          // Make sure we got a valid non-zero number
          if (minutes <= 0 || isNaN(minutes)) continue

          // Can't have more than one result
          if (result) return fail('MULTIPLE_DURATIONS')

          result = minutes
        }
      }
    }

    return result ? ParseResult.succeed(result) : fail('NO_DURATION')
  },

  encode: (duration, _, ast) =>
    ParseResult.fail(new ParseResult.Forbidden(ast, duration, 'DurationFromInput is read-only')),
})

class TimeEntry extends S.Class<TimeEntry>('TimeEntry')({
  id: S.optionalWith(S.String, {
    default: () => 'abc', // imagine a guid
    exact: true,
  }),
  userId: S.String,
  date: S.Union(LocalDateFromString, LocalDateSchema),
  input: S.String,
  duration: S.Union(DurationFromInput, S.Number),
}) {}

// And the schema for the input object would be:

class TimeEntryInput extends S.Class<TimeEntryInput>('TimeEntryInput')({
  userId: S.String,
  date: LocalDateSchema,
  input: S.String,
}) {}

// This works as expected:

test('DurationFromInput ', () => {
  const decode = S.decodeEither(DurationFromInput)
  const result = decode(`#overhead 1hr staff meeting`)
  assert(Either.isRight(result))
  const decoded = result.right
  expect(decoded).toBe(60)
})

// Now we can transform a TimeEntryInput into a TimeEntry:
const TimeEntryFromInput = S.transformOrFail(TimeEntryInput, TimeEntry, {
  strict: true,
  decode: ({ userId, date, input }) => {
    return ParseResult.succeed({
      userId,
      date,
      input,
      duration: input, // we pass the input to duration, which will be parsed
    })
  },
  encode: ({ userId, date, input }) =>
    ParseResult.succeed({
      userId,
      date: typeof date === 'string' ? LocalDate.parse(date) : date,
      input,
    }),
})

// This successfully converts a TimeEntryInput to a TimeEntry:

test('TimeEntryFromInput', () => {
  const decode = S.decodeEither(TimeEntryFromInput)
  const decodeResult = decode(timeEntryInput)
  assert(Either.isRight(decodeResult))
  const decoded = decodeResult.right
  expect(decoded).toEqual({
    id: 'abc',
    userId: '123',
    date: LocalDate.parse('2024-10-10'),
    input: `#overhead 1hr staff meeting`,
    duration: 60,
  })
  expect(decoded.userId).toBe('123')
  expect(decoded.duration).toBe(60)

  // when we encode, we get back the original input:

  const encode = S.encodeEither(TimeEntryFromInput)
  const encodeResult = encode(decoded)
  assert(Either.isRight(encodeResult))
  const encoded = encodeResult.right

  expect(encoded).toEqual(timeEntryInput)
})

// We can also take a TimeEntry and encode it to get the persistence format:

test('encoded TimeEntry', () => {
  const encode = S.encodeEither(TimeEntry)
  const encodeResult = encode({
    id: 'abc',
    userId: '123',
    date: LocalDate.parse('2024-10-10'), // <- LocalDate object
    input: `#overhead 1hr staff meeting`,
    duration: 60,
  })
  assert(Either.isRight(encodeResult))
  const encoded = encodeResult.right
  expect(encoded.date).toEqual('2024-10-10')
  expect(encoded.duration).toEqual(60)
  expect(encoded).toEqual({
    id: 'abc',
    userId: '123',
    date: '2024-10-10', // <- encoded as a string
    input: `#overhead 1hr staff meeting`,
    duration: 60,
  })
})

// And we can decode the persistence format back to a TimeEntry:

test('decoded TimeEntry', () => {
  const decode = S.decodeEither(TimeEntry)
  const decodeResult = decode({
    id: 'abc',
    userId: '123',
    date: '2024-10-10', // <- encoded as a string
    input: `#overhead 1hr staff meeting`,
    duration: 60,
  })
  assert(Either.isRight(decodeResult))
  const decoded = decodeResult.right
  expect(decoded).toEqual({
    id: 'abc',
    userId: '123',
    date: LocalDate.parse('2024-10-10'), // <- LocalDate object
    input: `#overhead 1hr staff meeting`,
    duration: 60,
  })
})
