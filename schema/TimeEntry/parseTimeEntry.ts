import { Effect as E } from 'effect'
import { parseClient } from './parseClient'
import { parseDuration } from './parseDuration'
import { parseProject } from './parseProject'
import { TimeEntry, type TimeEntryInput } from './TimeEntry'

export const parseTimeEntry = ({ input, userId, date }: TimeEntryInput) =>
  E.gen(function* (_) {
    const parsedDuration = yield* _(parseDuration(input))
    const parsedProject = yield* _(parseProject(input))
    const parsedClient = yield* _(parseClient(input))

    // The description is the remaining text after we've removed the duration, project, and client
    const description = collapseWhitespace(
      input //
        .replace(parsedDuration.text, '')
        .replace(parsedProject.text, '')
        .replace(parsedClient?.text ?? '', ''),
    )

    return new TimeEntry({
      userId,
      date,
      duration: parsedDuration.duration,
      project: parsedProject.project,
      client: parsedClient?.client,
      description,
      input,
    })
  })

const collapseWhitespace = (s: string) => s.replace(/\s+/g, ' ').trim()
