import { ParseResult, Schema as S } from '@effect/schema'
import { createId } from '@paralleldrive/cuid2'
import { Either, pipe } from 'effect'
import { ClientId } from './Client'
import { Cuid } from './Cuid'
import { DurationFromInput } from './Duration'
import { LocalDateFromString, LocalDateSchema } from './LocalDate'
import { ProjectFromInput, ProjectId } from './Project'
import { UserId } from './User'

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
  duration: DurationFromInput,
  project: ProjectFromInput,
  // clientId: S.optional(ClientId),
  description: S.optional(S.String),
}) {}

export const ParsedTimeEntryFromInput = S.transformOrFail(TimeEntryInput, ParsedTimeEntry, {
  strict: true,
  decode: ({ userId, date, input }, _, ast) => {
    return ParseResult.succeed({
      userId,
      date,
      input,
      duration: input,
      project: input,
      description: input,
    }).pipe(
      x => {
        if (Either.isRight(x)) {
          // TODO: strip out the project tag, the client tag, and the duration text; everything that's left is the description
          x.right.description = 'something'
        }
        return x
      },
      // , x=>validate(x)
    )
  },
  encode: (_, options, ast) =>
    ParseResult.fail(new ParseResult.Forbidden(ast, 'cannot encode a TimeEntry')),
})

export class TimeEntry extends S.Class<TimeEntry>('TimeEntry')({
  id: S.optional(TimeEntryId, { default: () => createId() as TimeEntryId }),
  userId: UserId,
  date: S.Union(LocalDateSchema, LocalDateFromString), // when coming from persistence, it's a string; when coming from the user, it's a LocalDate
  duration: S.Number,
  projectId: ProjectId, // Project?
  clientId: S.optional(ClientId), // S.optional(Client)?
  description: S.optional(S.String),
  timestamp: S.optional(S.DateFromNumber, { default: () => new Date() }),
}) {
  static decode = S.decodeSync(TimeEntry)
  static encode = S.encodeSync(TimeEntry)
}

export type TimeEntryEncoded = typeof TimeEntry.Encoded

export const TimeEntryFromParsedTimeEntry = S.transformOrFail(ParsedTimeEntry, TimeEntry, {
  strict: true,
  decode: ({ userId, date, input, duration, project }, _, ast) => {
    return ParseResult.succeed({
      userId,
      date,
      duration: duration.minutes,
      projectId: project.id,
      clientId: '' as ClientId,
    })
  },
  encode: (_, options, ast) =>
    ParseResult.fail(new ParseResult.Forbidden(ast, 'cannot encode a ParsedTimeEntry')),
})
