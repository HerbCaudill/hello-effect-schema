import { Schema as S } from '@effect/schema'
import { Context, pipe } from 'effect'
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

    // if we've matched on multiple codes (probably non-unique subCodes that aren't prefixed, like
    // entering `API` when there's `Feature: API` and `Support: API`), then we  return `undefined`
    // as if we haven't found a match
    if (results.length > 1) return undefined

    return results[0]
  }
}

export class Projects extends Context.Tag('Projects')<Projects, ProjectsProvider>() {}
