import { ParseResult, Schema as S } from '@effect/schema'
import { Context, Effect as E, pipe } from 'effect'
import { Cuid } from './Cuid'

export const ProjectId = pipe(Cuid, S.brand('ProjectId'))
export type ProjectId = typeof ProjectId.Type

export type Project = {
  id: ProjectId
  code: string
}

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
        : E.fail(new Error(`Project with code "${code}" not found`))
    }),
  )

/** Schema for a `projectId` encoded as a `code` */
export const ProjectIdFromCode = S.transformOrFail(S.String, ProjectId, {
  decode: (code, _, ast) => {
    return lookupProject(code).pipe(
      E.mapBoth({
        onFailure: e => new ParseResult.Type(ast, code, e.message),
        onSuccess: p => p.id,
      }),
    )
  },
  encode: ParseResult.succeed,
})
