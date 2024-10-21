import { Effect as E } from 'effect'
import { buildRegExp, capture, oneOrMore } from 'ts-regex-builder'
import { BaseError } from '../../lib/BaseError'
import { startWord, alphanumeric, endWord } from '../../lib/regex'
import { Clients } from '../Client'

/** Finds and parses a client code from inside a string of text */
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

export class MultipleClientsError extends BaseError {
  _tag = 'MULTIPLE_CLIENTS'
  constructor(context: { input: string }) {
    super(`An entry can only include one client code`, { context })
  }
}

export class ClientNotFoundError extends BaseError {
  _tag = 'CLIENT_NOT_FOUND'
  constructor(public readonly context: { input: string; code: string }) {
    super(`The client code "${context.code}" doesn't match a known client.`, { context })
  }
}
