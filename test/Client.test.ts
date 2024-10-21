import { Effect as E, pipe } from 'effect'
import { describe, expect } from 'vitest'
import { Clients, ClientsProvider } from '../schema/Client'
import { runTestCases, type BaseTestCase } from './lib/runTestCases'
import { testClients } from './data/clients'
import { ParsedClient } from '../schema/ParsedClient'

describe('Client', () => {
  const TestClients = new ClientsProvider(testClients)

  describe('ClientFromInput', () => {
    runTestCases({
      testCases: [
        { input: '@aba @chemonics', error: 'MULTIPLE_CLIENTS' },
        { input: '#out 1h', noClient: true },
        { input: '1h #Support: ongoing @aba', id: '001', text: '@aba' },
        { input: '1h #Ongoing @chemonics', id: '012', text: '@chemonics' },
      ] as TestCase[],
      decoder: (input: string) =>
        pipe(
          input, //
          ParsedClient.fromInput,
          E.provideService(Clients, TestClients),
        ),
      validate: (testCase, result) => {
        if (result === null) {
          expect(testCase.noClient).toBe(true)
        } else {
          expect(testCase.noClient).not.toBe(true)
          expect(result.client.id).toEqual(testCase.id)
          expect(result.text).toEqual(testCase.text)
        }
      },
    })
  })
})

type TestCase = BaseTestCase & {
  id?: string
  text?: string
  noClient?: boolean
}
