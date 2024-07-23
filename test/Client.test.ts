import { Schema as S } from '@effect/schema'
import { Effect as E, Either, pipe } from 'effect'
import { assert, describe, expect, it, test } from 'vitest'
import { ClientFromInput, ClientIdFromCode, Clients, ClientsProvider } from '../schema/Client'
import { testClients } from './testClients'

const TestClients = new ClientsProvider(testClients)

describe('Client', () => {
  describe('ClientIdFromCode', () => {
    const testCases: TestCase[] = [
      {
        input: '',
        error: 'CLIENT_NOT_FOUND',
      },
      {
        input: 'wow',
        error: 'CLIENT_NOT_FOUND',
      },
      {
        input: 'aba',
        clientId: '0001',
      },
      {
        input: 'chemonics',
        clientId: '0002',
      },
    ]

    const decode = (x: string) =>
      pipe(
        x, //
        S.decode(ClientIdFromCode),
        E.provideService(Clients, TestClients),
        E.either,
      )

    for (const { input, error, clientId, only, skip } of testCases) {
      const testFn = only ? test.only : skip ? test.skip : test

      testFn(input, () => {
        const result = E.runSync(decode(input))
        Either.match(result, {
          onLeft: e => {
            assert(error, `expected success but got error ${e.message}`)
            expect(e.message).toContain(error)
          },
          onRight: parsedId => {
            expect(parsedId).toEqual(clientId)
          },
        })
      })
    }
  })

  describe('ClientFromInput', () => {
    const testCases: TestCase[] = [
      {
        input: '',
        error: 'NO_CLIENT',
      },
      {
        input: 'aba',
        error: 'NO_CLIENT',
      },
      {
        input: '@wow',
        error: 'CLIENT_NOT_FOUND',
      },
      {
        input: '@aba @chemonics',
        error: 'MULTIPLE_CLIENTS',
      },
      {
        input: '1h #Support: ongoing @aba',
        clientId: '0001',
        text: '@aba',
      },
      {
        input: '1h #Ongoing @chemonics',
        clientId: '0002',
        text: '@chemonics',
      },
    ]

    const decode = (x: string) =>
      pipe(
        x, //
        S.decode(ClientFromInput),
        E.provideService(Clients, TestClients),
        E.either,
      )

    for (const { input, error, clientId, text, only, skip } of testCases) {
      const testFn = only ? test.only : skip ? test.skip : test

      testFn(input, () => {
        const result = E.runSync(decode(input))
        Either.match(result, {
          onLeft: e => {
            assert(error, `expected success but got error ${e.message}`)
            expect(e.message).toContain(error)
          },
          onRight: parsedClient => {
            expect(parsedClient.client.id).toEqual(clientId)
            expect(parsedClient.text).toEqual(text)
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
  only?: boolean
  skip?: boolean
}
