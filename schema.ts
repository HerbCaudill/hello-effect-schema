import { ParseResult, Schema as S } from '@effect/schema'
import { LocalDate } from '@js-joda/core'
import { pipe } from 'effect'
import { createId as _createId } from '@paralleldrive/cuid2'

// LocalDate
export const isLocalDate = (x: unknown): x is LocalDate => x instanceof LocalDate
export const LocalDateSchema = S.declare(isLocalDate)
export const LocalDateFromString = S.transformOrFail(
  S.String, // source
  LocalDateSchema, // target
  {
    decode: (s, options, ast) => {
      try {
        return ParseResult.succeed(LocalDate.parse(s))
      } catch (e) {
        return ParseResult.fail(new ParseResult.Type(ast, s, `string could not be parsed as LocalDate`))
      }
    },
    encode: d => ParseResult.succeed(d.toString()),
  }
)

export const Cuid = pipe(S.String, S.brand('Cuid'))
export type Cuid = typeof Cuid.Type
export const createId = () => _createId() as Cuid

export const UserId = pipe(Cuid, S.brand('UserId'))
export type UserId = typeof UserId.Type

// Projects

export const ProjectId = pipe(Cuid, S.brand('ProjectId'))
export type ProjectId = typeof ProjectId.Type
export type Project = { id: ProjectId; code: string }

// TimeEntry

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

// DoneEntry

export const DoneEntryId = pipe(Cuid, S.brand('DoneEntryId'))
export type DoneEntryId = typeof DoneEntryId.Type

export class DoneEntry extends S.Class<DoneEntry>('DoneEntry')({
  id: S.optional(DoneEntryId, { default: () => createId() as DoneEntryId }),
  userId: UserId,
  date: LocalDateFromString,
  content: S.String,
  likes: S.optional(S.Array(UserId), { default: () => [] }),
  timestamp: S.optional(S.DateFromNumber, { default: () => new Date() }),
}) {
  static decode = S.decodeSync(DoneEntry)
  static encode = S.encodeSync(DoneEntry)
}

export type DoneEntryEncoded = typeof DoneEntry.Encoded
