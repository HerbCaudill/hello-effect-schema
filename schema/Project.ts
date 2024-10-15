import { ParseResult, Schema as S } from '@effect/schema'
import { Context, Effect as E, pipe } from 'effect'
import { createId, Cuid } from './Cuid'
import { compose } from 'effect/Function'

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
    // if we've matched on multiple codes (likely non-unique subCodes that aren't prefixed)
    // return undefined as if we haven't found a match
    if (results.length > 1) return undefined

    return results[0]
  }
}

export class Projects extends Context.Tag('Projects')<Projects, ProjectsProvider>() {}

export class ParsedProject extends S.Class<ParsedProject>('ParsedProject')({
  /** The project in text form, e.g. `#Support: Ongoing` */
  text: S.String,

  /** The project object */
  project: Project,
}) {
  static fromInput(input: string) {
    return Projects.pipe(
      E.andThen(projects => {
        const projectCodeRegex =
          /(?<=^|\s)(?<text>(?:#)(?<code>[a-zA-Z0-9\-]+(\:\s*[a-zA-Z0-9\-]+)?))(?=$|\s)/gim

        const matches = Array.from(input.matchAll(projectCodeRegex))
        const results = matches.map(match => {
          const { text, code = '' } = match.groups as Record<string, string>
          return { text, code }
        })

        if (results.length > 1) return E.fail(new Error('MULTIPLE_PROJECTS'))
        if (results.length === 0) return E.fail(new Error('NO_PROJECT'))

        const { code, text } = results[0]
        const project = projects.getByCode(code)
        return project //
          ? E.succeed({ text, project })
          : E.fail(new Error('PROJECT_NOT_FOUND'))
      }),
    )
  }
}
