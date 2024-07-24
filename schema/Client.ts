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
  constructor(private readonly clients: Client[]) {}
  getByCode = (code: string) => this.clients.find(p => p.code.toLowerCase() === code.toLowerCase())
}

/** This defines the tag for the ClientsProvider */
export class Clients extends Context.Tag('Clients')<Clients, ClientsProvider>() {}

/**
 * Takes a code, gets access to the injected dependency, and uses that to return an
 * effect containing either the corresponding `clientId` or an error
 * */
const lookupClient = (code: string) =>
  Clients.pipe(
    E.flatMap(clients => {
      const client = clients.getByCode(code)
      return client //
        ? E.succeed(client)
        : E.fail(new Error('CLIENT_NOT_FOUND'))
    }),
  )

/** Schema for a `clientId` encoded as a `code` */
export const ClientIdFromCode = S.transformOrFail(S.String, ClientId, {
  decode: (code, _, ast) => {
    return lookupClient(code).pipe(
      E.mapBoth({
        onFailure: e => new ParseResult.Type(ast, code, e.message),
        onSuccess: p => p.id,
      }),
    )
  },
  encode: ParseResult.succeed,
})

/** Finds and parses a duration, expressed in decimal or hours:minutes, from inside a string of text */
export class ParsedClient extends S.Class<ParsedClient>('ParsedClient')({
  /** The client in text form, e.g. `#Support: Ongoing` */
  text: S.String,

  /** The client object */
  client: Client,
}) {}

export const ClientFromInput = S.transformOrFail(S.String, ParsedClient, {
  strict: true,
  decode: (input, _, ast) =>
    Clients.pipe(
      E.flatMap(clients => {
        const clientCodeRegex = /^(?<text>(?:@)(?<code>[a-zA-Z0-9\-]+))$/i

        let result: { text: string; code: string } | undefined

        for (const word of input.split(/\s+/)) {
          const match = word.match(clientCodeRegex)
          if (match) {
            const { text = '', code = '' } = match.groups!

            // Can't have more than one result
            if (result)
              return ParseResult.fail(new ParseResult.Type(ast, input, 'MULTIPLE_CLIENTS'))

            result = { text, code }
          }
        }

        if (result === undefined)
          return ParseResult.fail(new ParseResult.Type(ast, input, 'NO_CLIENT'))

        const client = clients.getByCode(result.code)
        return client //
          ? ParseResult.succeed({ text: result.text, client })
          : ParseResult.fail(new ParseResult.Type(ast, input, 'CLIENT_NOT_FOUND'))
      }),
    ),
  encode: (input, _, ast) =>
    ParseResult.fail(new ParseResult.Type(ast, input, 'cannot encode a client')),
})
