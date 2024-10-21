import { Schema as S } from '@effect/schema'
import { Effect as E } from 'effect'
import {
  buildRegExp,
  capture,
  choiceOf,
  oneOrMore,
  optional,
  whitespace,
  zeroOrMore,
} from 'ts-regex-builder'
import { alphanumeric, endWord, startWord } from '../lib/regex'
import { Project, Projects } from './Project'
import { BaseError } from '../lib/BaseError'

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

export class MultipleProjectsError extends BaseError {
  _tag = 'MULTIPLE_PROJECTS'
  constructor(context: { input: string }) {
    super(`An entry can only have one project code.`, { context })
  }
}

export class NoProjectError extends BaseError {
  _tag = 'NO_PROJECT'
  constructor(context: { input: string }) {
    super(`An entry must include a project code`, { context })
  }
}

export class ProjectNotFoundError extends BaseError {
  _tag = 'PROJECT_NOT_FOUND'
  constructor(public readonly context: { input: string; code: string }) {
    super(`The project code "${context.code}" doesn't match a known project.`, { context })
  }
}
