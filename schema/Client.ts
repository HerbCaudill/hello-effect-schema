import { ParseResult, Schema as S } from '@effect/schema'
import { Context, Effect as E, pipe } from 'effect'
import { Cuid } from './Cuid'

// Client

// branded ID
export const ClientId = pipe(Cuid, S.brand('ClientId'))
export type ClientId = typeof ClientId.Type

export type Client = {
  id: ClientId
  code: string
}

/** Give this class a list of clients and you can use it to look up clientIds  */
export class ClientsProvider {
  constructor(private readonly clients: Client[]) {}
  getByCode = (code: string) => this.clients.find(p => p.code === code)
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
        : E.fail(new Error(`Client with code "${code}" not found`))
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
  encode: (clientId, options, ast) => ParseResult.succeed('TODO'),
})
