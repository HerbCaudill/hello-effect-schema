import { test, expect, expectTypeOf } from 'vitest'
import { ParseResult, Schema as S } from '@effect/schema'
import { LocalDate } from '@js-joda/core'

// LocalDate schema

const isLocalDate = (input: unknown): input is LocalDate => input instanceof LocalDate
const LocalDateSchema = S.declare(isLocalDate)
const LocalDateSchemaTransformed = S.transform(
  S.String, // source
  LocalDateSchema, // target
  {
    decode: s => LocalDate.parse(s),
    encode: d => d.toString(),
  }
)

// Cuid is a branded String
const Cuid = S.String.pipe(S.brand(Symbol.for('Cuid')))
type Cuid = typeof Cuid.Type

// different IDs are branded Cuids
const brandedCuid = (name: string) => Cuid.pipe(S.brand(Symbol.for(name)))
const TimeEntryId = brandedCuid('TimeEntryId')
const UserId = brandedCuid('UserId')

export const TimeEntry = S.Struct({
  id: TimeEntryId,
  userId: UserId,
  date: LocalDateSchemaTransformed,
})
type TimeEntry = typeof TimeEntry.Type

test('decodes string to LocalDate', () => {
  const decode = S.decodeSync(LocalDateSchemaTransformed)
  const result = decode('2024-06-10')
  expect(result.year()).toBe(2024)
})

test('encodes LocalDate to string', () => {
  const encode = S.encodeSync(LocalDateSchemaTransformed)
  const today = LocalDate.parse('2024-06-10')
  const result = encode(today)
  expect(result).toBe('2024-06-10')
})

test('decodes TimeEntry', () => {
  const e = {
    id: 'clx93oz3c0000y1rl73kubp5h',
    userId: 'clx93p9w30000y1rlsfmymwsv',
    date: LocalDate.parse('2024-06-10'),
  }

  const decode = S.decodeSync(TimeEntry)
  const result = decode({
    id: 'clx93oz3c0000y1rl73kubp5h',
    userId: 'clx93p9w30000y1rlsfmymwsv',
    date: '2024-06-10',
  })

  expect(result).toEqual(e)

  expectTypeOf(result).toMatchTypeOf<TimeEntry>()
})
