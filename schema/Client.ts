import { Schema as S } from '@effect/schema'
import { Context, Effect as E, pipe } from 'effect'
import { buildRegExp, capture, oneOrMore } from 'ts-regex-builder'
import { createId, Cuid } from './Cuid'
import { alphanumeric, endWord, startWord } from './regex'
import { TimeEntryParseError } from './TimeEntryParseError'

// Client

// branded ID
export const ClientId = pipe(Cuid, S.brand('ClientId'))
export type ClientId = typeof ClientId.Type

export class Client extends S.Class<Client>('Client')({
  id: S.optionalWith(ClientId, { default: () => createId() as ClientId, exact: true }),
  code: S.String,
}) {}

/** Give this class a list of clients and you can use it to look up clientIds  */
export class ClientsProvider {
  private index: Record<ClientId, Client> = {}

  constructor(private readonly clients: Client[]) {
    this.index = clients.reduce<Record<ClientId, Client>>(
      (result, client) => ({ ...result, [client.id]: client }),
      {},
    )
  }

  getById = (id: ClientId) => this.index[id]

  getByCode = (input: string) => {
    const results = this.clients.filter(p => p.code.toLowerCase() === input.toLowerCase())
    return results[0]
  }
}

/** This defines the tag for the ClientsProvider */
export class Clients extends Context.Tag('Clients')<Clients, ClientsProvider>() {}

/** Finds and parses a client code from inside a string of text */
export class ParsedClient extends S.Class<ParsedClient>('ParsedClient')({
  /** The client code in text form, e.g. `@aba` */
  text: S.String,

  /** The client object */
  client: Client,
}) {
  static fromInput = (input: string) =>
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
}

export class MultipleClientsError extends TimeEntryParseError {
  _tag = 'MULTIPLE_CLIENTS'
  constructor(context: { input: string }) {
    super(`An entry can only include one client code`, { context })
  }
}

export class ClientNotFoundError extends TimeEntryParseError {
  _tag = 'CLIENT_NOT_FOUND'
  constructor(public readonly context: { input: string; code: string }) {
    super(`The client code "${context.code}" doesn't match a known client.`, { context })
  }
}
