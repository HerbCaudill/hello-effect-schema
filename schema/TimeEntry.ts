import { ParseResult, Schema as S } from '@effect/schema'
import { LocalDateFromString, LocalDateSchema } from './LocalDate'
import { Project, ProjectFromInput } from './Project'
import { UserId } from './User'
import { ParsedDurationFromInput } from './Duration'
import { pipe } from 'effect'
import { createId, Cuid } from './Cuid'
import { Client, ClientFromInput } from './Client'

export const TimeEntryId = pipe(Cuid, S.brand('TimeEntryId'))
export type TimeEntryId = typeof TimeEntryId.Type

export class TimeEntryInput extends S.Class<TimeEntryInput>('TimeEntryInput')({
  userId: UserId,
  date: LocalDateSchema,
  input: S.String,
}) {}

export class ParsedTimeEntry extends S.Class<ParsedTimeEntry>('ParsedTimeEntry')({
  userId: UserId,
  date: LocalDateSchema,
  input: S.String,
  duration: ParsedDurationFromInput,
  project: ProjectFromInput,
  client: ClientFromInput,
  timestamp: S.optionalWith(S.Date, { default: () => new Date(), exact: true }),
}) {}

export const ParsedTimeEntryFromInput = S.transformOrFail(TimeEntryInput, ParsedTimeEntry, {
  strict: true,
  decode: ({ userId, date, input }) => {
    return ParseResult.succeed({
      userId,
      date,
      input,
      duration: input,
      project: input,
      client: input,
    })
  },
  encode: decoded =>
    ParseResult.succeed({
      userId: decoded.userId as UserId,
      date: decoded.date,
      input: decoded.input,
    }),
})

/** A time entry that decodes from serialized form (e.g. from storage) */
export class TimeEntry extends S.Class<TimeEntry>('TimeEntry')({
  id: S.optionalWith(TimeEntryId, { default: () => createId() as TimeEntryId, exact: true }),
  userId: UserId,
  date: LocalDateSchema,
  duration: S.Number,
  project: Project,
  client: Client,
  description: S.optional(S.String),
  input: S.String,
  timestamp: S.DateFromSelf,
}) {}

/** Decodes a ParsedTimeEntry into a TimeEntry */
export const TimeEntryFromParsedTimeEntry = S.transformOrFail(ParsedTimeEntry, TimeEntry, {
  strict: true,
  decode: ({ userId, date, input, duration, project, client, timestamp }, _, ast) => {
    const description = input
      .replace(duration.text, '')
      .replace(project.text, '')
      .replace(client.text, '')
      .trim()

    return ParseResult.succeed({
      userId,
      date,
      duration: duration.minutes,
      project: project.project,
      client: client.client,
      input,
      description,
      timestamp,
    })
  },
  encode: decoded =>
    ParseResult.succeed({
      userId: decoded.userId as UserId,
      date: decoded.date,
      input: decoded.input,
      duration: { text: `${decoded.duration}min`, minutes: decoded.duration },
      project: { text: decoded.project.code, project: decoded.project as Project },
      client: { text: decoded.client.code, client: decoded.client as Client },
      timestamp: decoded.timestamp,
    }),
})

export const TimeEntryFromInput = S.compose(ParsedTimeEntryFromInput, TimeEntryFromParsedTimeEntry)
