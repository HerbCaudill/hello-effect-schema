import { Schema as S } from '@effect/schema'
import { LocalDate } from '@js-joda/core'
import { pipe } from 'effect'
import { Cuid } from './Cuid'
import { LocalDateFromString, LocalDateSchema } from './LocalDate'
import { ProjectFromId, ProjectFromInput } from './Project'
import { UserId } from './User'

export const TimeEntryId = pipe(Cuid, S.brand('TimeEntryId'))
export type TimeEntryId = typeof TimeEntryId.Type

// when a user inputs a new time entry, this is the information we have:
const inputFormat = {
  userId: '1234',
  date: LocalDate.parse('2021-09-01'),
  input: '1h #Support: Ongoing @ABA update geography',
}

// from this, we extract a duration in minutes, and we look up the project and the client.

// when the app is working with a time entry, it looks like this:
const inMemoryFormat = {
  id: '0001',
  userId: '1234',
  date: LocalDate.parse('2021-09-01'),
  duration: 60,
  project: {}, // project object
  client: {}, // client object
  description: 'update geography',
  input: '1h #Support: Ongoing @ABA update geography',
}

// when a time entry is stored to disk, it looks like this:
const storageFormat = {
  id: '0001',
  userId: '1234',
  date: '2021-09-01', // as string
  duration: 60,
  projectId: '0005',
  clientId: '0001',
  description: 'update geography',
  input: '1h #Support: Ongoing @ABA update geography',
}

import { Schema } from '@effect/schema'

export class TimeEntryInput extends S.Class<TimeEntryInput>('TimeEntryInput')({
  userId: UserId,
  date: LocalDateFromString,
  input: Schema.String,
}) {}

export class ParsedTimeEntry extends S.Class<ParsedTimeEntry>('ParsedTimeEntry')({
  userId: UserId,
  date: LocalDateSchema,
  input: Schema.String,
  // duration: DurationFromInput,
  project: ProjectFromInput,
  // client: ClientFromInput,
}) {}

export class TimeEntry extends S.Class<TimeEntry>('TimeEntry')({
  id: TimeEntryId,
  userId: Schema.String,
  date: LocalDateSchema,
  // duration: Schema.Number,
  project: ProjectFromId,
  // client: ClientFromId,
  description: Schema.String,
  input: Schema.String,
}) {}

export class EncodedTimeEntry extends S.Class<EncodedTimeEntry>('EncodedTimeEntry')({
  id: Schema.String,
  userId: Schema.String,
  date: Schema.String,
  // duration: Schema.Number,
  projectId: Schema.String,
  // clientId: Schema.String,
  description: Schema.String,
  input: Schema.String,
}) {}

// Transformation from inputFormat to inMemoryFormat
const TimeEntryFromInput = Schema.transform(TimeEntryInput, TimeEntry, {
  strict: true,
  decode: input => ({
    id: '0001', // Generate or assign an ID
    userId: input.userId,
    date: input.date,
    duration: parseDuration(input.input), // Implement parseDuration to extract duration
    project: {}, // Lookup project based on input
    client: {}, // Lookup client based on input
    description: extractDescription(input.input), // Implement extractDescription
    input: input.input,
  }),
  encode: timeEntry => ({
    userId: timeEntry.userId,
    date: timeEntry.date,
    input: timeEntry.input,
  }),
})

// // Transformation from inMemoryFormat to storageFormat
// const inMemoryToStorage = Schema.transform(TimeEntry, storageFormatSchema, {
//   strict: true,
//   decode: inMemory => ({
//     id: inMemory.id,
//     userId: inMemory.userId,
//     date: inMemory.date.toString(), // Convert LocalDate to string
//     duration: inMemory.duration,
//     projectId: inMemory.project.id, // Assuming project has an id
//     clientId: inMemory.client.id, // Assuming client has an id
//     description: inMemory.description,
//     input: inMemory.input,
//   }),
//   encode: storage => ({
//     id: storage.id,
//     userId: storage.userId,
//     date: LocalDate.parse(storage.date), // Convert string to LocalDate
//     duration: storage.duration,
//     project: { id: storage.projectId }, // Lookup project by id
//     client: { id: storage.clientId }, // Lookup client by id
//     description: storage.description,
//     input: storage.input,
//   }),
// })

// Helper functions (implement these as needed)
function parseDuration(input: string): number {
  // Extract duration from input string
  return 60 // Example implementation
}

function extractDescription(input: string): string {
  // Extract description from input string
  return 'update geography' // Example implementation
}

// /** The data we have at the moment a user inputs a new time entry */
// export class TimeEntryInput extends S.Class<TimeEntryInput>('TimeEntryInput')({
//   userId: UserId,
//   date: LocalDateSchema,
//   input: S.String,
// }) {}

// /** The data we have after parsing a user's input */
// export class ParsedTimeEntry extends S.Class<ParsedTimeEntry>('ParsedTimeEntry')({
//   userId: UserId,
//   date: LocalDateSchema,
//   input: S.String,
//   duration: DurationFromInput,
//   project: ProjectFromInput,
//   client: ClientFromInput,
// }) {}

// /** */
// export const ParsedTimeEntryFromInput = S.transformOrFail(TimeEntryInput, ParsedTimeEntry, {
//   strict: true,
//   decode: ({ userId, date, input }) => {
//     return ParseResult.succeed({
//       userId: userId as UserId,
//       date,
//       input,
//       duration: input,
//       project: input,
//       client: input,
//     })
//   },
//   encode: decoded =>
//     ParseResult.succeed({
//       userId: decoded.userId as UserId,
//       date: decoded.date,
//       input: decoded.input,
//     }),
// })

// /** A time entry that decodes from serialized form (e.g. from storage)   */
// export class TimeEntry extends S.Class<TimeEntry>('TimeEntry')({
//   id: S.optionalWith(TimeEntryId, { default: () => createId() as TimeEntryId, exact: true }),
//   userId: UserId,
//   date: LocalDateFromString, // when coming from persistence, it's a string; when coming from the user, it's a LocalDate
//   duration: S.Number,
//   project: Project,
//   client: Client,
//   description: S.optional(S.String),
//   input: S.String,
//   timestamp: S.optionalWith(S.Union(S.DateFromNumber, S.DateFromSelf), {
//     default: () => new Date(),
//     exact: true,
//   }),
// }) {}

// // /** Decodes a ParsedTimeEntry into a TimeEntry */
// // export const TimeEntryFromParsedTimeEntry = S.transformOrFail(ParsedTimeEntry, TimeEntry, {
// //   strict: true,
// //   decode: ({ userId, date, input, duration, project, client }, _, ast) => {
// //     const description = input
// //       .replace(duration.text, '')
// //       .replace(project.text, '')
// //       .replace(client.text, '')
// //       .trim()

// //     return ParseResult.succeed({
// //       userId: userId as UserId,
// //       date: LocalDate.now(),
// //       duration: duration.minutes,
// //       project: project.project,
// //       client: client.client,
// //       input,
// //       description,
// //     })
// //   },
// //   encode: decoded =>
// //     ParseResult.succeed({
// //       userId: decoded.userId as UserId,
// //       date: decoded.date,
// //       input: decoded.input,
// //       duration: { text: `${decoded.duration}min`, minutes: decoded.duration },
// //       project: { text: decoded.project.code, project: decoded.project as Project },
// //       client: { text: decoded.client.code, client: decoded.client as Client },
// //     }),
// // })

// export const TimeEntryFromInput = S.compose(ParsedTimeEntry, TimeEntry)
