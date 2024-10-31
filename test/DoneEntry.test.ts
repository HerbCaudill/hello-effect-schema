import { Schema as S } from '@effect/schema'
import { LocalDate } from '@js-joda/core'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { DoneEntry, type DoneEntryEncoded } from '../schema/DoneEntry'
import type { UserId } from '../schema/User'

describe('DoneEntry', () => {
  const decode = S.decodeSync(DoneEntry)
  const encode = S.encodeSync(DoneEntry)

  it('decodes DoneEntry', () => {
    const decoded = decode({
      userId: '0001',
      date: '2024-06-10',
      content: 'Coded and compiled terabytes of data',
    })

    // userId was cast as a UserId
    expectTypeOf(decoded.userId).toMatchTypeOf<UserId>()

    // id was populated
    expect(decoded.id).toBeTypeOf('string')
    expect(decoded.id).toHaveLength(24)

    // date was parsed
    expect(decoded.date).toBeInstanceOf(LocalDate)
    expect(decoded.date.year()).toBe(2024)
    expect(decoded.date.monthValue()).toBe(6)
    expect(decoded.date.dayOfMonth()).toBe(10)

    // content was left untouched
    expect(decoded.content).toBe('Coded and compiled terabytes of data')

    // likes was initialized as an empty array
    expect(decoded.likes).toEqual([])

    // timestamp was populated
    expect(decoded.timestamp).toBeInstanceOf(Date)

    expectTypeOf(decoded).toMatchTypeOf<DoneEntry>()
  })

  it('encodes DoneEntry', () => {
    const decoded = decode({
      userId: '0001',
      date: '2024-06-10',
      content: 'Coded and compiled terabytes of data',
    })

    const encoded = encode(decoded)

    expectTypeOf(encoded).toMatchTypeOf<DoneEntryEncoded>()

    // round trip
    const decodedAgain = decode(encoded)
    expect(decodedAgain).toEqual(decoded)
  })
})
