import { ParseResult, Schema as S } from '@effect/schema'
import { createId } from '@paralleldrive/cuid2'
import { Either, pipe } from 'effect'
import { Cuid } from './Cuid'
import { LocalDateFromString } from './LocalDate'
import { ProjectId } from './Project'
import { UserId } from './User'
import { ClientId } from './Client'
import { DurationFromString } from './Duration'

export const TimeEntryId = pipe(Cuid, S.brand('TimeEntryId'))
export type TimeEntryId = typeof TimeEntryId.Type

export class TimeEntry extends S.Class<TimeEntry>('TimeEntry')({
  id: S.optional(TimeEntryId, { default: () => createId() as TimeEntryId }),
  // TODO: we won't know userId and date from the input text, make them optional or create a subtype for parsing?
  userId: UserId,
  date: LocalDateFromString,
  originalText: S.String,
  duration: S.Number,
  projectId: ProjectId,
  clientId: S.optional(ClientId),
  description: S.optional(S.String),
  timestamp: S.optional(S.DateFromNumber, { default: () => new Date() }),
}) {
  static decode = S.decodeSync(TimeEntry)
  static encode = S.encodeSync(TimeEntry)
}

export type TimeEntryEncoded = typeof TimeEntry.Encoded

export const TimeEntryFromString = S.transformOrFail(S.String, TimeEntry, {
  strict: true,
  decode: (input, _, ast) => {
    let description = input

    // mock some values just to get start
    const userId = '1' as UserId
    const date = '2024-07-15'
    const projectId: ProjectId = '' as ProjectId

    // find a projectId using ProjectFromString (to be written) which will use ProjectIdFromCode

    // find a clientId (ditto)

    // find a duration using DurationFromString
    let duration: number = 0
    const decodeDuration = S.decodeEither(DurationFromString)
    const parsedDuration = decodeDuration(input)
    if (Either.isLeft(parsedDuration)) {
      return ParseResult.fail(
        new ParseResult.Type(ast, input, parsedDuration.left.error.error.message.value),
      )
    } else {
      duration = parsedDuration.right.duration
      description = description.replace(parsedDuration.right.text, '')
    }

    // strip out the project tag, the client tag, and the duration text; everything that's left is the description

    // validate using basically the code in xdev (validation code inline for now)

    return ParseResult.succeed({
      userId,
      date,
      originalText: input,
      duration,
      projectId,
      clientId: undefined,
      description: description.trim(),
    })
  },
  encode: (_, options, ast) => ParseResult.fail(new ParseResult.Forbidden(ast, 'cannot encode a TimeEntry')),
})
