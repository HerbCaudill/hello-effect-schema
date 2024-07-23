import { ParseResult, Schema as S } from '@effect/schema'
import { createId } from '@paralleldrive/cuid2'
import { Effect as E, pipe } from 'effect'
import { ClientFromInput, ClientId } from './Client'
import { Cuid } from './Cuid'
import { DurationFromInput } from './Duration'
import { LocalDateFromString, LocalDateSchema } from './LocalDate'
import { ProjectFromInput, ProjectId } from './Project'
import { UserId } from './User'

export const TimeEntryId = pipe(Cuid, S.brand('TimeEntryId'))
export type TimeEntryId = typeof TimeEntryId.Type

/** The data we have at the moment a user inputs a new time entry */
export class TimeEntryInput extends S.Class<TimeEntryInput>('TimeEntryInput')({
  userId: UserId,
  date: LocalDateSchema,
  input: S.String,
}) {}

/** This is an intermediate representation that isn't useful for anything else.   */
export class ParsedTimeEntry //
  extends TimeEntryInput.transformOrFailFrom<ParsedTimeEntry>('ParsedTimeEntry')(
    {
      duration: DurationFromInput,
      project: ProjectFromInput,
      client: ClientFromInput,
    },
    {
      decode: ({ userId, date, input }, _, ast) => {
        return ParseResult.succeed({
          userId,
          date,
          input,
          duration: input,
          project: input,
          client: input,
        })
      },
      encode: (_, options, ast) =>
        ParseResult.fail(new ParseResult.Forbidden(ast, 'cannot encode')),
    },
  ) {}

/** A time entry that decodes from serialized form (e.g. from storage)   */
export class TimeEntry extends S.Class<TimeEntry>('TimeEntry')({
  id: S.optionalWith(TimeEntryId, { default: () => createId() as TimeEntryId }),
  userId: UserId,
  date: S.Union(LocalDateSchema, LocalDateFromString), // when coming from persistence, it's a string; when coming from the user, it's a LocalDate
  duration: S.Number,
  projectId: ProjectId, // Project?
  clientId: S.optional(ClientId), // S.optional(Client)?
  description: S.optional(S.String),
  input: S.String,
  timestamp: S.optionalWith(S.DateFromNumber, { default: () => new Date() }),
}) {}

/** The serialized TimeEntry */
export type TimeEntryEncoded = typeof TimeEntry.Encoded

/** Decodes a ParsedTimeEntry into a TimeEntry */
export const TimeEntryFromParsedTimeEntry = S.transformOrFail(ParsedTimeEntry, TimeEntry, {
  strict: true,
  decode: ({ userId, date, input, duration, project, client }) => {
    const description = input
      .replace(duration.text, '')
      .replace(project.text, '')
      .replace(client.text, '')
      .trim()
    return ParseResult.succeed({
      userId,
      date,
      duration: duration.minutes,
      projectId: project.project.id!, // TODO: We shouldn't have to insist that the ID is populated
      clientId: client.client.id,
      input,
      description,
    })
  },
  encode: (_, options, ast) => ParseResult.fail(new ParseResult.Forbidden(ast, 'cannot encode')),
})

// I'd like to have a single decoder that goes from TimeEntryInput to TimeEntry, but can't get it to work.

// something I don't understand going on with the timestamp.

// Typescript says:
// Type '(timeEntryInput: TimeEntryInput) => E.Effect<TimeEntry, ParseResult.ParseError, Projects>' is not assignable to type '((fromA: TimeEntryInput, options: ParseOptions, ast: Transformation, fromI: { readonly userId: string; readonly date: LocalDate; readonly input: string; }) => Effect<...>) | ((fromA: TimeEntryInput, options: ParseOptions, ast: Transformation, fromI: { ...; }) => Effect<...>)'.
//   Type '(timeEntryInput: TimeEntryInput) => E.Effect<TimeEntry, ParseResult.ParseError, Projects>' is not assignable to type '(fromA: TimeEntryInput, options: ParseOptions, ast: Transformation, fromI: { readonly userId: string; readonly date: LocalDate; readonly input: string; }) => Effect<...>'.
//     Type 'Effect<TimeEntry, ParseError, Projects>' is not assignable to type 'Effect<{ readonly userId: string; readonly date: string | LocalDate; readonly duration: number; readonly projectId: string; readonly id?: string | undefined; readonly description?: string | undefined; readonly clientId?: string | undefined; readonly timestamp?: number | undefined; }, ParseIssue, Projects>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
//       Type 'TimeEntry' is not assignable to type '{ readonly userId: string; readonly date: string | LocalDate; readonly duration: number; readonly projectId: string; readonly id?: string | undefined; readonly description?: string | undefined; readonly clientId?: string | undefined; readonly timestamp?: number | undefined; }'.
//         Types of property 'timestamp' are incompatible.
//           Type 'Date' is not assignable to type 'number'.ts(2322)

// Tested with:
// ```ts
// const decode = (x: TimeEntryInput) =>
//   pipe(
//     x, //
//     S.decode(TimeEntryFromInput),
//     E.provideService(Projects, TestProjects),
//     E.either,
//   )
// ```
// // but failed with:
// AssertionError: expected success but got error ((TimeEntryInput (Encoded side) <-> TimeEntryInput) <-> (TimeEntry (Encoded side) <-> TimeEntry))
// └─ Type side transformation failure
//    └─ (TimeEntry (Encoded side) <-> TimeEntry)
//       └─ Encoded side transformation failure
//          └─ TimeEntry (Encoded side)
//             └─ Encoded side transformation failure
//                └─ Struct (Encoded side)
//                   └─ ["timestamp"]
//                      └─ DateFromNumber | undefined
//                         ├─ DateFromNumber
//                         │  └─ Encoded side transformation failure
//                         │     └─ Expected number, actual Tue Jul 23 2024 18:12:01 GMT+0200 (Central European Summer Time)
//                         └─ Expected undefined, actual Tue Jul 23 2024 18:12:01 GMT+0200 (Central European Summer

// export const TimeEntryFromInput = S.transformOrFail(TimeEntryInput, TimeEntry, {
//   strict: true,
//   decode: (timeEntryInput: TimeEntryInput) =>
//     pipe(
//       timeEntryInput, //
//       S.decode(ParsedTimeEntry),
//       E.flatMap(S.decode(TimeEntryFromParsedTimeEntry)),
//     ),
//   encode: (_, options, ast) => ParseResult.fail(new ParseResult.Forbidden(ast, 'cannot encode')),
// })

// this kind of accomplishes that, but feels unidiomatic since the other decoders use TransformOrFail
export const TimeEntryFromInput = (timeEntryInput: TimeEntryInput) =>
  pipe(
    timeEntryInput, //
    S.decode(ParsedTimeEntry),
    E.flatMap(S.decode(TimeEntryFromParsedTimeEntry)),
  )
