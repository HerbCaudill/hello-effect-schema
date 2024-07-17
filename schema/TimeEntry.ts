import { ParseResult, Schema as S } from '@effect/schema'
import { createId } from '@paralleldrive/cuid2'
import { pipe } from 'effect'
import { Cuid } from './Cuid'
import { LocalDateFromString } from './LocalDate'
import { ProjectId } from './Project'
import { UserId } from './User'

export const TimeEntryId = pipe(Cuid, S.brand('TimeEntryId'))
export type TimeEntryId = typeof TimeEntryId.Type

export class TimeEntry extends S.Class<TimeEntry>('TimeEntry')({
  id: S.optional(TimeEntryId, { default: () => createId() as TimeEntryId }),
  userId: UserId,
  date: LocalDateFromString,
  duration: S.Number,
  projectId: ProjectId,
  clientId: S.optional(ProjectId),
  description: S.optional(S.String),
  timestamp: S.optional(S.DateFromNumber, { default: () => new Date() }),
}) {
  static decode = S.decodeSync(TimeEntry)
  static encode = S.encodeSync(TimeEntry)
}

export type TimeEntryEncoded = typeof TimeEntry.Encoded

export const TimeEntryFromString = S.transformOrFail(S.String, TimeEntry, {
  strict: true,
  decode: (s, _, ast) => {
    const [userId, date, duration, projectId, clientId, description] = s.split('|')
    return ParseResult.succeed({
      userId,
      date,
      duration: Number(duration),
      projectId,
      clientId: clientId || undefined,
      description: description || undefined,
    })
  },
  encode: (_, options, ast) => ParseResult.fail(new ParseResult.Forbidden(ast, 'cannot encode a TimeEntry')),
})
