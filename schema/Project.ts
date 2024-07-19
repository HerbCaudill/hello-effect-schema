import { ParseResult, Schema as S } from '@effect/schema'
import { Context, Effect as E, pipe } from 'effect'
import { createId, Cuid } from './Cuid'

export const ProjectId = pipe(Cuid, S.brand('ProjectId'))
export type ProjectId = typeof ProjectId.Type

export class Project extends S.Class<Project>('Project')({
  id: S.optional(ProjectId, { default: () => createId() as ProjectId }),
  code: S.String,
  subCode: S.optional(S.String),
  description: S.optional(S.String),
  requiresClient: S.optional(S.Boolean, { default: () => false }),
}) {}

/** Give this class a list of projects and you can use it to look up projectIds  */
export class ProjectsProvider {
  constructor(private readonly projects: Project[]) {}
  getByCode = (code: string) =>
    this.projects.find(p => {
      if (p.code.toLowerCase() === code.toLowerCase()) return true
      // TODO: only return a subcode match if the subcode is unique
      if (p.subCode?.toLowerCase() === code.toLowerCase()) return true
      return false
    })
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
        : E.fail(`Project with code "${code}" not found`)
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

export const ProjectFromInput = S.transformOrFail(S.String, Project, {
  strict: true,
  decode: (input, _, ast) =>
    Projects.pipe(
      E.flatMap(projects => {
        const projectCodeRegex =
          /(?:^|\s)(?<text>(?:#)(?<codePrefix>[a-zA-Z0-9\-]+)(\:\s*)(?<subCode>[a-zA-Z0-9\-]+)?|(?:#)(?<codeAlone>[a-zA-Z0-9\-]+))(?:$|\s)/gim

        const matches = Array.from(input.matchAll(projectCodeRegex))
        const results = matches.map(match => {
          const { text, subCode = '', codeAlone = '' } = match.groups as Record<string, string>
          const code = subCode ?? codeAlone
          return { text, code }
        })

        if (results.length > 1)
          return ParseResult.fail(new ParseResult.Type(ast, input, 'MULTIPLE_PROJECTS'))
        if (results.length === 0)
          return ParseResult.fail(new ParseResult.Type(ast, input, 'NO_PROJECT'))

        const { code } = results[0]
        const project = projects.getByCode(code)
        return project //
          ? ParseResult.succeed(project)
          : ParseResult.fail(
              new ParseResult.Type(ast, input, `Project with code "${code}" not found`),
            )
      }),
    ),
  encode: (input, _, ast) =>
    ParseResult.fail(new ParseResult.Type(ast, input, 'cannot encode a Project')),
})
