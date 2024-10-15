import { describe, expect } from 'vitest'
import { ParsedDuration } from '../schema/Duration'
import { runTestCases, BaseTestCase } from './lib/runTestCases'

describe('Duration', () => {
  const testCases: TestCase[] = [
    // INVALID

    { input: '#proposals', error: 'NO_DURATION' },
    { input: '@aba', error: 'NO_DURATION' },

    { input: '#out` -:45', error: 'NO_DURATION' }, // the minus sign keeps it from seeing this as a duration
    { input: '#out, 1.25min', error: 'NO_DURATION' }, // can't have decimal minutes
    { input: '#out 1', error: 'NO_DURATION' },
    { input: '#out 1.', error: 'NO_DURATION' },
    { input: '#out 0:00', error: 'NO_DURATION' },
    { input: '#out 0hr', error: 'NO_DURATION' },
    { input: '#out 0min', error: 'NO_DURATION' },
    { input: '#out1:15', error: 'NO_DURATION' },
    { input: '#out 1:15doctor', error: 'NO_DURATION' },
    { input: '#out 1:15(doctor)', error: 'NO_DURATION' },
    { input: '#out 1:15hrs', error: 'NO_DURATION' },
    { input: '1:15#out', error: 'NO_DURATION' },
    { input: '1:15, #out', error: 'NO_DURATION' },
    { input: '#out 1:15:30', error: 'NO_DURATION' },
    { input: '#out2hrs', error: 'NO_DURATION' },

    { input: '#out 1hr 30min', error: 'MULTIPLE_DURATIONS' },
    { input: '#out 1:30 and 1:31', error: 'MULTIPLE_DURATIONS' },
    { input: '#out 1:01 25min', error: 'MULTIPLE_DURATIONS' },
    { input: '#out 1:30 1:31', error: 'MULTIPLE_DURATIONS' },
    { input: '#out 1h 2h', error: 'MULTIPLE_DURATIONS' },

    // VALID

    { input: '#out 1:15', duration: 75 },
    { input: '#out 1:15 doctor', duration: 75 },
    { input: '1:15 #out', duration: 75 },

    { input: '#out 0:15', duration: 15 },
    { input: '#out :15', duration: 15 },

    { input: '#out 1h', duration: 60 },
    { input: '#out 1H', duration: 60 },
    { input: '#out 1hr', duration: 60 },
    { input: '#out 1hrs', duration: 60 },

    { input: '#out 2h', duration: 120 },
    { input: '#out 2hr', duration: 120 },
    { input: '#out 2hrs', duration: 120 },

    { input: '#out 1h30', duration: 90 },
    { input: '#out 1h30m', duration: 90 },
    { input: '#out 1h30min', duration: 90 },
    { input: '#out 1h30mins', duration: 90 },
    { input: '#out 1hr30mins', duration: 90 },

    { input: '#out 15m', duration: 15 },
    { input: '#out 15min', duration: 15 },
    { input: '#out 15mins', duration: 15 },
    { input: '#out 15MIN', duration: 15 },
    { input: '#out 15mIn', duration: 15 },
    { input: '#out 15MIN', duration: 15 },

    { input: '#out .25', duration: 15 },
    { input: '#out 0.25', duration: 15 },

    { input: '#out 1.25', duration: 75 },
    { input: '#out 1.25H', duration: 75 },
    { input: '#out 1.25h', duration: 75 },
    { input: '#out 1.25hr', duration: 75 },
    { input: '#out 1.25hrs', duration: 75 },
  ]

  runTestCases({
    testCases,
    decoder: ParsedDuration.fromInput,
    validate: (expected, actual) => {
      expect(actual.duration).toEqual(expected.duration)
    },
  })
})

type TestCase = BaseTestCase & {
  duration?: number
}
