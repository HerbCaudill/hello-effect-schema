import { Effect as E, pipe } from 'effect'
import { describe } from 'vitest'
import { Clients, ClientsProvider, ParsedClient } from '../schema/Client'
import { runTestCases, type BaseTestCase } from './lib/runTestCases'
import { testClients } from './lib/testClients'

describe('Client', () => {
  const TestClients = new ClientsProvider(testClients)

  describe('ClientFromInput', () => {
    runTestCases({
      testCases: [
        { input: '@aba @chemonics', error: 'MULTIPLE_CLIENTS' },
        { input: '#out 1h', clientId: 'null' },
        { input: '1h #Support: ongoing @aba', clientId: '0001', text: '@aba' },
        { input: '1h #Ongoing @chemonics', clientId: '0002', text: '@chemonics' },
      ] as TestCase[],
      decoder: (input: string) =>
        pipe(
          input, //
          ParsedClient.fromInput,
          E.provideService(Clients, TestClients),
        ),
      mapResult: result =>
        result
          ? {
              clientId: result.client.id,
              text: result.text,
            }
          : { clientId: 'null' },
    })
  })
})

type TestCase = BaseTestCase & {
  id?: string
  text?: string
}
