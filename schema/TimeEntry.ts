import { Schema as S } from '@effect/schema'
import { Effect as E } from 'effect'
import { pipe } from 'effect'
import { Client, ClientFromInput } from './Client'
import { createId, Cuid } from './Cuid'
import { LocalDateSchema } from './LocalDate'
import { Project, ProjectFromInput } from './Project'
import { UserId } from './User'
import { ParsedDurationFromInput } from './Duration'
import { DateFromNumber } from '@effect/schema/Schema'

export const TimeEntryId = pipe(Cuid, S.brand('TimeEntryId'))
export type TimeEntryId = typeof TimeEntryId.Type

export class TimeEntryInput extends S.Class<TimeEntryInput>('TimeEntryInput')({
  userId: UserId,
  date: LocalDateSchema,
  input: S.String,
}) {}

/** A time entry that decodes from serialized form (e.g. from storage) */
export class TimeEntry extends S.Class<TimeEntry>('TimeEntry')({
  id: S.optionalWith(TimeEntryId, { default: () => createId() as TimeEntryId, exact: true }),
  userId: UserId,
  date: LocalDateSchema,
  duration: S.Number,
  project: Project,
  client: S.optional(Client),
  description: S.optional(S.String),
  input: S.String,
  timestamp: S.optionalWith(DateFromNumber, { default: () => new Date(), exact: true }),
}) {
  static fromInput({ userId, date, input }: TimeEntryInput) {
    return E.gen(function* (_) {
      const { duration, text: durationText } = yield* _(S.decode(ParsedDurationFromInput)(input))
      const { project, text: projectText } = yield* _(S.decode(ProjectFromInput)(input))
      const { client, text: clientText } = yield* _(S.decode(ClientFromInput)(input))

      // The description is the remaining text after we've removed the duration, project, and client
      const description = collapseWhitespace(
        input //
          .replace(durationText, '')
          .replace(projectText, '')
          .replace(clientText, ''),
      )

      return new TimeEntry({ userId, date, duration, project, client, description, input })
    })
  }
}

const collapseWhitespace = (s: string) => s.replace(/\s+/g, ' ').trim()
