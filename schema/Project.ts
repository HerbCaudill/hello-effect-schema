import { ParseResult, Schema as S } from '@effect/schema'
import { Context, Effect as E, pipe } from 'effect'
import { createId, Cuid } from './Cuid'

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

/** Schema for a `projectId` encoded as a `code` */
export const ProjectIdFromCode = S.transformOrFail(S.String, ProjectId, {
  strict: true,
  decode: (code, _, ast) =>
    E.gen(function* () {
      const projects = yield* Projects
      const project = projects.getByCode(code)
      return yield* project //
        ? E.succeed(project.id)
        : E.fail(new ParseResult.Type(ast, code, 'PROJECT_NOT_FOUND'))
    }),
  encode: (id, _, ast) =>
    E.gen(function* () {
      const projects = yield* Projects
      const project = projects.getByCode(id)
      return yield* project //
        ? E.succeed(project.code)
        : E.fail(new ParseResult.Type(ast, id, 'PROJECT_NOT_FOUND'))
    }),
})

/** Schema for a `Project` encoded as a `projectId` */
export const ProjectFromId = S.transformOrFail(ProjectId, Project, {
  strict: true,
  decode: (id, _, ast) =>
    E.gen(function* () {
      const projects = yield* Projects
      const project = projects.getById(id)
      return yield* project //
        ? E.succeed(project)
        : E.fail(new ParseResult.Type(ast, id, 'PROJECT_NOT_FOUND'))
    }),
  encode: project => ParseResult.succeed(project.id as ProjectId),
})

export class ParsedProject extends S.Class<ParsedProject>('ParsedProject')({
  /** The project in text form, e.g. `#Support: Ongoing` */
  text: S.String,

  /** The project object */
  project: Project,
}) {}

/** Finds and parses a duration, expressed in decimal or hours:minutes, from inside a string of text */
export const ProjectFromInput = S.transformOrFail(S.String, ParsedProject, {
  strict: true,
  decode: (input, _, ast) =>
    Projects.pipe(
      E.flatMap(projects => {
        const projectCodeRegex =
          /(?<=^|\s)(?<text>(?:#)(?<code>[a-zA-Z0-9\-]+(\:\s*[a-zA-Z0-9\-]+)?))(?=$|\s)/gim

        const matches = Array.from(input.matchAll(projectCodeRegex))
        const results = matches.map(match => {
          const { text, code = '' } = match.groups as Record<string, string>
          return { text, code }
        })

        if (results.length > 1)
          return ParseResult.fail(new ParseResult.Type(ast, input, 'MULTIPLE_PROJECTS'))
        if (results.length === 0)
          return ParseResult.fail(new ParseResult.Type(ast, input, 'NO_PROJECT'))

        const { code, text } = results[0]
        const project = projects.getByCode(code)
        return project //
          ? ParseResult.succeed({ text, project })
          : ParseResult.fail(new ParseResult.Type(ast, input, 'PROJECT_NOT_FOUND'))
      }),
    ),
  encode: (input, _, ast) => ParseResult.fail(new ParseResult.Type(ast, input, 'cannot encode')),
})
