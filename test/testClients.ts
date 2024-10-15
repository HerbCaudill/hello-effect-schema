import { Client } from '../schema/Client'

/** Sample list of clients */
export const testClients = [
  {
    id: '0001',
    code: 'aba',
  },
  {
    id: '0002',
    code: 'chemonics',
  },
].map(c => new Client(c))
