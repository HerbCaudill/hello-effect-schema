import { Schema as S } from '@effect/schema'
import { LocalDate } from '@js-joda/core'
import { Either } from 'effect'
import { assert, describe, expect, expectTypeOf, it } from 'vitest'
import { LocalDateFromString } from './schema'

describe('LocalDate', () => {
  const encode = S.encodeSync(LocalDateFromString)
  const decode = S.decodeSync(LocalDateFromString)

  it('decodes string to LocalDate', () => {
    const result = decode('2024-06-10')
    expect(result.year()).toBe(2024)
  })

  it('encodes LocalDate to string', () => {
    const today = LocalDate.parse('2024-06-10')
    const result = encode(today)
    expect(result).toBe('2024-06-10')
  })

  it('does not decode invalid LocalDate', () => {
    const decode = S.decodeUnknownSync(LocalDateFromString)
    expect(() => decode('foo')).toThrow(/string could not be parsed as LocalDate/)
  })

  it('safe decoding using `Either`', () => {
    const decode = S.decodeUnknownEither(LocalDateFromString)
    const result = decode('2024-07-11')
    assert(Either.isRight(result))
    expectTypeOf(result.right).toMatchTypeOf<LocalDate>()
    expect(result.right).toMatchInlineSnapshot(`"2024-07-11"`)
  })

  it('safe error handling using `Either`', () => {
    const decode = S.decodeUnknownEither(LocalDateFromString)
    const result = decode('foo')
    assert(Either.isLeft(result))
    expect(result.left).toMatchInlineSnapshot(`
      [ParseError: (string <-> <declaration schema>)
      └─ Transformation process failure
         └─ string could not be parsed as LocalDate]
    `)
  })
})
