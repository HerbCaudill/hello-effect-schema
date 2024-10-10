import { ParseResult, Schema as S } from '@effect/schema'
import { pipe } from 'effect'
import { DurationFromInput } from './Duration.simple.test'
import { LocalDateSchema } from './LocalDate'
import { createId } from '@paralleldrive/cuid2'

export class TimeEntryInput extends S.Class<TimeEntryInput>('TimeEntryInput')({
  userId: S.String,
  date: LocalDateSchema,
  input: S.String,
}) {}

export class ParsedTimeEntry extends S.Class<ParsedTimeEntry>('ParsedTimeEntry')({
  userId: S.String,
  date: LocalDateSchema,
  input: S.String,
  duration: DurationFromInput,
}) {}

/** A time entry that decodes from serialized form (e.g. from storage) */
export class TimeEntry extends S.Class<TimeEntry>('TimeEntry')({
  id: S.optionalWith(S.String, { default: () => createId(), exact: true }),
  userId: S.String,
  date: LocalDateSchema,
  duration: S.Number,
  input: S.String,
}) {}

/** Decodes a ParsedTimeEntry into a TimeEntry */
export const TimeEntryFromParsedTimeEntry = S.transformOrFail(ParsedTimeEntry, TimeEntry, {
  strict: true,
  decode: ({ userId, date, input, duration }, _, ast) => {
    return ParseResult.succeed({
      userId,
      date,
      input,
      duration,
    })
  },
  encode: ({ userId, input, date, duration }) =>
    ParseResult.succeed({
      userId,
      input,
      date,
      duration,
    }),
})

export const TimeEntryFromInput = S.compose(TimeEntryInput, TimeEntryFromParsedTimeEntry)
