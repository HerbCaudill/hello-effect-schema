import { ParseResult, Schema as S } from '@effect/schema'
import { createId } from '@paralleldrive/cuid2'
import { Either, pipe } from 'effect'
import { Cuid } from './Cuid'
import { LocalDateFromString } from './LocalDate'
import { ProjectFromInput, ProjectId, ProjectIdFromCode } from './Project'
import { UserId } from './User'
import { ClientId } from './Client'
import { DurationFromInput } from './Duration'

export const TimeEntryId = pipe(Cuid, S.brand('TimeEntryId'))
export type TimeEntryId = typeof TimeEntryId.Type

export class TimeEntry extends S.Class<TimeEntry>('TimeEntry')({
  id: S.optional(TimeEntryId, { default: () => createId() as TimeEntryId }),
  userId: UserId,
  date: LocalDateFromString,
  input: S.String,
  duration: S.Number,
  projectId: ProjectId,
  clientId: S.optional(ClientId),
  description: S.optional(S.String),
  timestamp: S.optional(S.DateFromNumber, { default: () => new Date() }),
}) {}

export type TimeEntryEncoded = typeof TimeEntry.Encoded

export class ParsedTimeEntry extends S.Class<ParsedTimeEntry>('ParsedTimeEntry')({
  input: S.String,
  duration: DurationFromInput,
  project: ProjectFromInput,
  // clientId: S.optional(ClientId),
  description: S.optional(S.String),
}) {}

export const ParsedTimeEntryFromInput = S.transformOrFail(S.String, ParsedTimeEntry, {
  strict: true,
  decode: (input, _, ast) => {
    // find a projectId using ProjectFromString (to be written) which will use ProjectIdFromCode
    const projectId = 'out'

    // find a clientId (ditto)

    // description = description.replace(input, '')

    // strip out the project tag, the client tag, and the duration text; everything that's left is the description

    // validate using basically the code in xdev (validation code inline for now)

    return ParseResult.succeed({
      input,
      duration: input,
      project: input,
      description: input,
    })
  },
  encode: (_, options, ast) =>
    ParseResult.fail(new ParseResult.Forbidden(ast, 'cannot encode a TimeEntry')),
})
