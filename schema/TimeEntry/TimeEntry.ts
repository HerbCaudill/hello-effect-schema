import { Schema as S } from '@effect/schema'
import { pipe } from 'effect'
import { Client } from '../Client'
import { createId, Cuid } from '../Cuid'
import { LocalDateFromString, LocalDateSchema } from '../LocalDate'
import { Project } from '../Project'
import { UserId } from '../User'

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
  date: LocalDateFromString,
  duration: S.Number,
  project: Project,
  client: S.optional(Client),
  description: S.optional(S.String),
  input: S.String,
  timestamp: S.optionalWith(S.DateFromSelf, { default: () => new Date(), exact: true }),
}) {}
