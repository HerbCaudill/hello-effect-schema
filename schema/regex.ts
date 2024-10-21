import {
  lookbehind,
  choiceOf,
  startOfString,
  whitespace,
  lookahead,
  endOfString,
  charRange,
  digit,
} from 'ts-regex-builder'

export const startWord = lookbehind(choiceOf(startOfString, whitespace))
export const endWord = lookahead(choiceOf(endOfString, whitespace))
const lowerCaseLetter = charRange('a', 'z')
const upperCaseLetter = charRange('A', 'Z')
export const alphanumeric = choiceOf(lowerCaseLetter, upperCaseLetter, digit)
