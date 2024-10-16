import { ParseResult, Schema as S } from '@effect/schema'
import { Context, Effect as E, pipe } from 'effect'
import { createId, Cuid } from './Cuid'

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
    const [code, subCode] = input.split(/:\s*/gi)
    const results = this.clients.filter(p => {
      if (p.code.toLowerCase() === code.toLowerCase()) return true
      return false
    })
    return results[0]
  }
}

/** This defines the tag for the ClientsProvider */
export class Clients extends Context.Tag('Clients')<Clients, ClientsProvider>() {}

/** Finds and parses a duration, expressed in decimal or hours:minutes, from inside a string of text */
export class ParsedClient extends S.Class<ParsedClient>('ParsedClient')({
  /** The client in text form, e.g. `#Support: Ongoing` */
  text: S.String,

  /** The client object */
  client: Client,
}) {
  static fromInput(input: string) {
    return Clients.pipe(
      E.flatMap(clients => {
        const clientCodeRegex = /^(?<text>(?:@)(?<code>[a-zA-Z0-9\-]+))$/i

        let result: { text: string; code: string } | undefined

        for (const word of input.split(/\s+/)) {
          const match = word.match(clientCodeRegex)
          if (match) {
            const { text = '', code = '' } = match.groups!

            // Can't have more than one result
            if (result) return E.fail(new Error('MULTIPLE_CLIENTS'))

            result = { text, code }
          }
        }

        if (result === undefined) return E.succeed(null)

        const client = clients.getByCode(result.code)
        return client //
          ? E.succeed({ text: result.text, client })
          : E.fail(new Error('CLIENT_NOT_FOUND'))
      }),
    )
  }
}
