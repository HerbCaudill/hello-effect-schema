import { Schema as S } from '@effect/schema'
import { createId } from '@paralleldrive/cuid2'
import { pipe } from 'effect'
import { Cuid } from './Cuid'
import { LocalDateFromString } from './LocalDate'
import { UserId } from './User'

// branded ID
export const DoneEntryId = pipe(Cuid, S.brand('DoneEntryId'))
export type DoneEntryId = typeof DoneEntryId.Type

export class DoneEntry extends S.Class<DoneEntry>('DoneEntry')({
  id: S.optional(DoneEntryId, { default: () => createId() as DoneEntryId }),
  userId: UserId,
  date: LocalDateFromString,
  content: S.String,
  likes: S.optional(S.Array(UserId), { default: () => [] }),
  timestamp: S.optional(S.DateFromNumber, { default: () => new Date() }),
}) {
  static decode = S.decodeSync(DoneEntry)
  static encode = S.encodeSync(DoneEntry)
}

export type DoneEntryEncoded = typeof DoneEntry.Encoded
