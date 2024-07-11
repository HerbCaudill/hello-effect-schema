import { LocalDate } from '@js-joda/core'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { DoneEntry, type DoneEntryEncoded, type UserId } from './schema'

describe('DoneEntry', () => {
  it('decodes DoneEntry', () => {
    const decoded = DoneEntry.decode({
      userId: '0001' as UserId,
      date: '2024-06-10',
      content: 'Coded and compiled terabytes of data',
    })

    // id was populated
    expect(decoded.id).toBeTypeOf('string')
    expect(decoded.id).toHaveLength(24)

    // date was parsed
    expect(decoded.date).toBeInstanceOf(LocalDate)

    // content was left untouched
    expect(decoded.content).toBe('Coded and compiled terabytes of data')

    // likes was initialized as an empty array
    expect(decoded.likes).toEqual([])

    // timestamp was populated
    expect(decoded.timestamp).toBeInstanceOf(Date)

    expectTypeOf(decoded).toMatchTypeOf<DoneEntry>()
  })

  it('encodes DoneEntry', () => {
    const decoded = DoneEntry.decode({
      userId: '0001' as UserId,
      date: '2024-06-10',
      content: 'Coded and compiled terabytes of data',
    })

    const encoded = DoneEntry.encode(decoded)

    expectTypeOf(encoded).toMatchTypeOf<DoneEntryEncoded>()

    const decodedAgain = DoneEntry.decode(encoded)
    expect(decodedAgain).toEqual(decoded)
  })
})
