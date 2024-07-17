import { Schema as S } from '@effect/schema'
import { pipe } from 'effect'
import { Cuid } from './Cuid'

export const UserId = pipe(Cuid, S.brand('UserId'))
export type UserId = typeof UserId.Type
