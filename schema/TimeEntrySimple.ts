import { ParseResult, Schema as S } from '@effect/schema'
import { pipe } from 'effect'
import { Cuid } from './Cuid'
import { DurationFromInput } from './Duration'

export const TimeEntryId = pipe(Cuid, S.brand('TimeEntryId'))
export type TimeEntryId = typeof TimeEntryId.Type

export class TimeEntryInput extends S.Class<TimeEntryInput>('TimeEntryInput')({
  input: S.String,
}) {}

export class ParsedTimeEntry extends S.Class<ParsedTimeEntry>('ParsedTimeEntry')({
  input: S.String,
  duration: DurationFromInput,
}) {}

export const ParsedTimeEntryFromInput = S.transformOrFail(TimeEntryInput, ParsedTimeEntry, {
  strict: true,
  decode: ({ input }) => {
    return ParseResult.succeed({
      input,
      duration: input,
    })
  },
  encode: decoded =>
    ParseResult.succeed({
      input: decoded.input,
    }),
})

/** A time entry that decodes from serialized form (e.g. from storage) */
export class TimeEntry extends S.Class<TimeEntry>('TimeEntry')({
  duration: S.Number,
  input: S.String,
}) {}

/** Decodes a ParsedTimeEntry into a TimeEntry */
export const TimeEntryFromParsedTimeEntry = S.transformOrFail(ParsedTimeEntry, TimeEntry, {
  strict: true,
  decode: ({ input, duration }, _, ast) => {
    return ParseResult.succeed({
      duration: duration.minutes,
      input,
    })
  },
  encode: decoded =>
    ParseResult.succeed({
      input: decoded.input,
      duration: { text: `${decoded.duration}min`, minutes: decoded.duration },
    }),
})

export const TimeEntryFromInput = S.compose(ParsedTimeEntryFromInput, TimeEntryFromParsedTimeEntry)
