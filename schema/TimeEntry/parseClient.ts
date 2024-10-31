import { Effect as E } from 'effect'
import { buildRegExp, capture, oneOrMore } from 'ts-regex-builder'
import { BaseError } from '../../lib/BaseError'
import { alphanumeric, endWord, startWord } from '../../lib/regex'
import { Clients } from '../Client'

/**
 * Given a string of text, finds a client code (marked by the `@` character), and looks up the
 * corresponding client.
 *
 * For example, given the input `@aba 1h #support: ongoing`, succeeds with
 *
 * ```ts
 * {
 *   text: '@aba',
 *   client: {
 *    id: '001',
 *    code: 'aba',
 *    // ... rest of client object
 *   }
 * }
 * ```
 * If no client code is found, succeeds with `null` (since a client is optional).
 */
export const parseClient = (input: string) =>
  Clients.pipe(
    E.andThen(clients => {
      const clientCodeRegex = buildRegExp(
        [
          startWord,
          capture(
            ['@', capture(oneOrMore(alphanumeric), { name: 'code' })], // code doesn't include the @
            { name: 'text' }, // text includes the @
          ),
          endWord,
        ],
        { ignoreCase: true, multiline: true, global: true },
      )

      const matches = Array.from(input.matchAll(clientCodeRegex))
      const results = matches.map(match => match.groups as { text: string; code: string })

      // Input must contain exactly one project code
      if (results.length > 1) return E.fail(new MultipleClientsError({ input }))
      if (results.length === 0) return E.succeed(null)

      const { code, text } = results[0]
      const client = clients.getByCode(code)
      return client //
        ? E.succeed({ text, client })
        : E.fail(new ClientNotFoundError({ input, code }))
    }),
  )

export class MultipleClientsError extends BaseError('MULTIPLE_CLIENTS') {
  constructor(readonly context: { input: string }) {
    super('An entry can only include one client code', context)
  }
}

export class ClientNotFoundError extends BaseError('CLIENT_NOT_FOUND') {
  constructor(readonly context: { input: string; code: string }) {
    super(`The client code "${context.code}" doesn't match a known client.`, context)
  }
}

const foo = new ClientNotFoundError({ input: 'foo', code: 'bar' })
console.log(foo.context)
