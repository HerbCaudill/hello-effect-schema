import { ParseResult, Schema as S } from '@effect/schema'
import { Context, Effect as E, pipe } from 'effect'
import { createId, Cuid } from './Cuid'
import type { Transformation } from '@effect/schema/ParseResult'

export const ProjectId = pipe(Cuid, S.brand('ProjectId'))
export type ProjectId = typeof ProjectId.Type

export class Project extends S.Class<Project>('Project')({
  id: S.optional(ProjectId, { default: () => createId() as ProjectId }),
  code: S.String,
}) {}

/** Give this class a list of projects and you can use it to look up projectIds  */
export class ProjectsProvider {
  constructor(private readonly projects: Project[]) {}
  getByCode = (code: string) => this.projects.find(p => p.code === code)
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
        const code = 'out' // TODO find this in the input
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
