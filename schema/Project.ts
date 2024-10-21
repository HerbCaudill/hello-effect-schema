import { Schema as S } from '@effect/schema'
import { Context, Effect as E, pipe } from 'effect'
import { createId, Cuid } from './Cuid'
import { TimeEntryParseError } from './TimeEntryParseError'
import {
  buildRegExp,
  capture,
  choiceOf,
  oneOrMore,
  optional,
  whitespace,
  zeroOrMore,
} from 'ts-regex-builder'
import { alphanumeric, endWord, startWord } from './regex'

export const ProjectId = pipe(Cuid, S.brand('ProjectId'))
export type ProjectId = typeof ProjectId.Type

export class Project extends S.Class<Project>('Project')({
  id: S.optionalWith(ProjectId, { default: () => createId() as ProjectId, exact: true }),
  code: S.String,
  subCode: S.optional(S.String),
  description: S.optional(S.String),
  requiresClient: S.optionalWith(S.Boolean, { default: () => false, exact: true }),
}) {}

/** Give this class a list of projects and you can use it to look projects by ID or by code  */
export class ProjectsProvider {
  private index: Record<ProjectId, Project> = {}

  constructor(private readonly projects: Project[]) {
    this.index = projects.reduce<Record<ProjectId, Project>>(
      (result, project) => ({ ...result, [project.id]: project }),
      {},
    )
  }

  getById = (id: ProjectId) => this.index[id]

  getByCode = (input: string) => {
    const [code, subCode] = input.split(/:\s*/gi)
    const results = this.projects.filter(p => {
      if (
        p.code.toLowerCase() === code.toLowerCase() &&
        p.subCode?.toLowerCase() === subCode?.toLowerCase()
      )
        return true
      if (p.subCode?.toLowerCase() === code.toLowerCase()) return true
      return false
    })

    // if we've matched on multiple codes (probably non-unique subCodes that aren't prefixed, like
    // entering `API` when there's `Feature: API` and `Support: API`), then we  return `undefined`
    // as if we haven't found a match
    if (results.length > 1) return undefined

    return results[0]
  }
}

export class Projects extends Context.Tag('Projects')<Projects, ProjectsProvider>() {}

export class ParsedProject extends S.Class<ParsedProject>('ParsedProject')({
  /** The project code in text form, e.g. `#Support: Ongoing` */
  text: S.String,

  /** The project object */
  project: Project,
}) {
  static fromInput(input: string) {
    return Projects.pipe(
      E.andThen(projects => {
        const projectCodeRegex = buildRegExp(
          [
            startWord,
            capture(
              [
                '#',
                capture(
                  [
                    oneOrMore(choiceOf(alphanumeric)), // code
                    optional([':', zeroOrMore(whitespace), oneOrMore(alphanumeric)]), // subCode
                  ],
                  { name: 'code' }, // code doesn't include the #
                ),
              ],
              { name: 'text' }, // text includes the #
            ),
            endWord,
          ],
          { ignoreCase: true, multiline: true, global: true },
        )

        // /(?<=^|\s)(?<text>#(?<code>[\p{L}\p{N}\-]+(:\s*[\p{L}\p{N}\-]+)?))(?=$|\s)/gimu
        const matches = Array.from(input.matchAll(projectCodeRegex))
        const results = matches.map(match => match.groups as { text: string; code: string })

        // Input must contain exactly one project code
        if (results.length > 1) return E.fail(new MultipleProjectsError({ input }))
        if (results.length === 0) return E.fail(new NoProjectError({ input }))

        const { code, text } = results[0]
        const project = projects.getByCode(code)
        return project //
          ? E.succeed({ text, project })
          : E.fail(new ProjectNotFoundError({ input, code }))
      }),
    )
  }
}

export class MultipleProjectsError extends TimeEntryParseError {
  _tag = 'MULTIPLE_PROJECTS'
  constructor(context: { input: string }) {
    super(`An entry can only have one project code.`, { context })
  }
}

export class NoProjectError extends TimeEntryParseError {
  _tag = 'NO_PROJECT'
  constructor(context: { input: string }) {
    super(`An entry must include a project code`, { context })
  }
}

export class ProjectNotFoundError extends TimeEntryParseError {
  _tag = 'PROJECT_NOT_FOUND'
  constructor(public readonly context: { input: string; code: string }) {
    super(`The project code "${context.code}" doesn't match a known project.`, { context })
  }
}
