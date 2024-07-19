import { ProjectsProvider, type Project } from '../schema/Project'

/** Instantiated ProjectsProvider with our list of projects */
export const testProjects = [
  {
    id: '0001',
    code: 'Business: Proposals',
    description: 'Writing/editing proposals for specific prospects',
    requiresClient: true,
  },
  {
    id: '0002',
    code: 'Out',
    description: '',
  },
  {
    id: '0003',
    code: 'Overhead',
    description:
      'General meetings, company process stuff, finance stuff, HR, onboarding, learning…',
  },
  {
    id: '0004',
    code: 'Security',
    description: 'All things security',
  },
  {
    id: '0005',
    code: 'Support',
    subCode: 'Ongoing',
    description: 'Includes engineering support to individual clients (but not bug fixing)',
  },
  {
    id: '0006',
    code: 'Support',
    subCode: 'Setup',
    description: 'Everything before the instance goes live',
    requiresClient: true,
  },
  {
    id: '0007',
    code: 'Support',
    subCode: 'Training',
    description: 'Training dedicated to one specific client',
  },
  {
    id: '0008',
    code: 'Tech wealth',
    subCode: 'Bug fixin',
    description: "Probably mostly on call. Note feature in comments if it's a major feature fix.",
  },
] as Project[]
