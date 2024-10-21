import { Schema as S } from '@effect/schema'
import { Context, pipe } from 'effect'
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
    const results = this.clients.filter(p => p.code.toLowerCase() === input.toLowerCase())
    return results[0]
  }
}

/** This defines the tag for the ClientsProvider */
export class Clients extends Context.Tag('Clients')<Clients, ClientsProvider>() {}
