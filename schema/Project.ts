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

/** Give this class a list of projects and you can use it to look up projectIds  */
export class ProjectsProvider {
  constructor(private readonly projects: Project[]) {}
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
    // if we've matched on multiple codes, likely non-unique subCodes that aren't prefixed,
    // return undefined as if we haven't found a match
    if (results.length > 1) return undefined

    return results[0]
  }
}

/** This defines the tag for the ProjectsProvider */
export class Projects extends Context.Tag('Projects')<Projects, ProjectsProvider>() {}

/**
 * Takes a code, gets access to the injected dependency, and uses that to return an
 * effect containing either the corresponding `projectId` or an error
 * */
const lookupProject = (code: string) =>
  Projects.pipe(
    E.flatMap(projects => {
      const project = projects.getByCode(code)
      return project //
        ? E.succeed(project)
        : E.fail('PROJECT_NOT_FOUND')
    }),
  )

/** Schema for a `projectId` encoded as a `code` */
export const ProjectIdFromCode = S.transformOrFail(S.String, ProjectId, {
  strict: true,
  decode: (code, _, ast) => {
    return lookupProject(code).pipe(
      E.mapBoth({
        onFailure: e => new ParseResult.Type(ast, code, e),
        onSuccess: p => p.id,
      }),
    )
  },
  encode: ParseResult.succeed,
})

/** Finds and parses a duration, expressed in decimal or hours:minutes, from inside a string of text */
export class ParsedProject extends S.Class<ParsedProject>('ParsedProject')({
  /** The project in text form, e.g. `#Support: Ongoing` */
  text: S.String,

  /** The project object */
  project: Project,
}) {}

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
  encode: (input, _, ast) =>
    ParseResult.fail(new ParseResult.Type(ast, input, 'cannot encode a Project')),
})
