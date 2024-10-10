import { ParseResult, Schema as S } from '@effect/schema'
import { LocalDate } from '@js-joda/core'
import { Effect as E } from 'effect'
import { expect, test } from 'vitest'
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

// And the schema for the input object would be:

class TimeEntryInput extends S.Class<TimeEntryInput>('TimeEntryInput')({
  userId: S.String,
  date: LocalDateSchema,
  input: S.String,
}) {}

// This works as expected:

test('DurationFromInput ', () => {
  const decode = S.decode(DurationFromInput)
  const decoded = E.runSync(decode(`#overhead 1hr staff meeting`))
  expect(decoded).toBe(60)
})

// Now, a TimeEntry can come from two sources: it can be deserialized from storage...

class DeserializedTimeEntry extends S.Class<DeserializedTimeEntry>('DeserializedTimeEntry')({
  id: S.String,
  userId: S.String,
  date: LocalDateFromString,
  input: S.String,
  duration: S.Number,
}) {}

// ...or it can be parsed from user input:

class ParsedTimeEntry extends S.Class<ParsedTimeEntry>('ParsedTimeEntry')({
  id: S.optionalWith(S.String, {
    default: () => 'abc', // imagine a guid
    exact: true,
  }),
  userId: S.String,
  date: LocalDateSchema,
  input: S.String,
  duration: DurationFromInput,
}) {}

// The TimeEntry schema we'll use is a union of those two:

const TimeEntry = S.Union(DeserializedTimeEntry, ParsedTimeEntry)

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

// we can use this transformation to convert the input to a TimeEntry and vice versa:

test('TimeEntryFromInput', () => {
  const decode = S.decode(TimeEntryFromInput)
  const decoded = E.runSync(decode(timeEntryInput))
  expect(decoded).toEqual({
    id: 'abc',
    userId: '123',
    date: LocalDate.parse('2024-10-10'),
    input: `#overhead 1hr staff meeting`,
    duration: 60,
  })

  // when we encode we get back the original input:
  const encode = S.encode(TimeEntryFromInput)
  const encoded = E.runSync(encode(decoded))
  expect(encoded).toEqual(timeEntryInput)
})

// We can also encode a TimeEntry to get the persistence format:

test('encoded TimeEntry', () => {
  const encode = S.encode(TimeEntry)
  const timeEntry = {
    id: 'abc',
    userId: '123',
    date: LocalDate.parse('2024-10-10'), // <- LocalDate object
    input: `#overhead 1hr staff meeting`,
    duration: 60,
  }

  const encoded = E.runSync(encode(timeEntry))
  expect(encoded.date).toEqual('2024-10-10')
  expect(encoded.duration).toEqual(60)
  expect(encoded).toEqual({
    id: 'abc',
    userId: '123',
    date: '2024-10-10', // <- encoded as a string
    input: `#overhead 1hr staff meeting`,
    duration: 60,
  })

  // And we can decode the persistence format back to a TimeEntry:
  const decode = S.decodeEither(TimeEntry)
  const decoded = E.runSync(decode(encoded))
  expect(decoded).toEqual(timeEntry)
})
