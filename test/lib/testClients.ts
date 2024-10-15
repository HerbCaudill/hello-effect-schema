import { Client, type ClientId } from '../../schema/Client'

/** Sample list of clients */
export const testClients = [
  {
    id: '0001' as ClientId,
    code: 'aba',
  },
  {
    id: '0002' as ClientId,
    code: 'chemonics',
  },
].map(c => new Client(c))
