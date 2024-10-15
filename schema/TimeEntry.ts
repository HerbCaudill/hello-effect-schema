import { Schema as S } from '@effect/schema'
import { Effect as E, pipe } from 'effect'
import { Client, ParsedClient } from './Client'
import { createId, Cuid } from './Cuid'
import { ParsedDuration } from './Duration'
import { LocalDateSchema } from './LocalDate'
import { ParsedProject, Project } from './Project'
import { UserId } from './User'

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
  timestamp: S.optionalWith(S.DateFromSelf, { default: () => new Date(), exact: true }),
}) {
  static fromInput({ userId, date, input }: TimeEntryInput) {
    return E.gen(function* (_) {
      const parsedDuration = yield* _(ParsedDuration.fromInput(input))
      const parsedProject = yield* _(ParsedProject.fromInput(input))
      const parsedClient = yield* _(ParsedClient.fromInput(input))

      // The description is the remaining text after we've removed the duration, project, and client
      const description = collapseWhitespace(
        input //
          .replace(parsedDuration.text, '')
          .replace(parsedProject.text, '')
          .replace(parsedClient?.text ?? '', ''),
      )

      return new TimeEntry({
        userId,
        date,
        duration: parsedDuration.duration,
        project: parsedProject.project,
        client: parsedClient?.client,
        description,
        input,
      })
    })
  }
}

const collapseWhitespace = (s: string) => s.replace(/\s+/g, ' ').trim()
