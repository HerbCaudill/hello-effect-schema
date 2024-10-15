import { Schema as S } from '@effect/schema'
import { Effect as E, Either, pipe } from 'effect'
import { assert, describe, expect, it, test as _test } from 'vitest'
import { ClientIdFromCode, Clients, ClientsProvider, ParsedClient } from '../schema/Client'
import { testClients } from './testClients'

describe('Client', () => {
  const TestClients = new ClientsProvider(testClients)

  describe('ClientFromInput', () => {
    const testCases: TestCase[] = [
      { input: '@aba @chemonics', error: 'MULTIPLE_CLIENTS' },
      { input: '#out 1h', isNull: true },
      { input: '1h #Support: ongoing @aba', clientId: '0001', text: '@aba' },
      { input: '1h #Ongoing @chemonics', clientId: '0002', text: '@chemonics' },
    ]

    const decode = (input: string) =>
      pipe(
        input, //
        ParsedClient.fromInput,
        E.provideService(Clients, TestClients),
        E.either,
        E.runSync,
      )

    for (const { input, error, clientId, text, isNull, only, skip } of testCases) {
      const test = only ? _test.only : skip ? _test.skip : _test

      test(input, () => {
        const result = decode(input)
        Either.match(result, {
          onLeft: e => {
            assert(error, `expected success but got error ${e.message}`)
            expect(e.message).toContain(error)
          },
          onRight: parsedClient => {
            if (parsedClient === null) {
              expect(isNull).toBe(true)
            } else {
              expect(isNull).not.toBe(true)
              expect(parsedClient.client.id).toEqual(clientId)
              expect(parsedClient.text).toEqual(text)
            }
          },
        })
      })
    }
  })
})

type TestCase = {
  input: string
  error?: string
  clientId?: string
  text?: string
  isNull?: boolean
  only?: boolean
  skip?: boolean
}
