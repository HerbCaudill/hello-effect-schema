import { Project, type ProjectId } from '../../schema/Project'

/** Instantiated ProjectsProvider with our list of projects */
export const testProjects = [
  {
    id: '0001' as ProjectId,
    code: 'Business: Proposals',
    description: 'Writing/editing proposals for specific prospects',
    requiresClient: true,
  },
  {
    id: '0002' as ProjectId,
    code: 'Out',
    description: '',
  },
  {
    id: '0003' as ProjectId,
    code: 'Overhead',
    description:
      'General meetings, company process stuff, finance stuff, HR, onboarding, learning…',
  },
  {
    id: '0004' as ProjectId,
    code: 'Security',
    description: 'All things security',
  },
  {
    id: '0005' as ProjectId,
    code: 'Support',
    subCode: 'Ongoing',
    description: 'Includes engineering support to individual clients (but not bug fixing)',
  },
  {
    id: '0006' as ProjectId,
    code: 'Support',
    subCode: 'Setup',
    description: 'Everything before the instance goes live',
    requiresClient: true,
  },
  {
    id: '0007' as ProjectId,
    code: 'Support',
    subCode: 'Training',
    description: 'Training dedicated to one specific client',
  },
  {
    id: '0008' as ProjectId,
    code: 'Tech wealth',
    subCode: 'Bug fixin',
    description: "Probably mostly on call. Note feature in comments if it's a major feature fix.",
  },
  {
    id: '0009' as ProjectId,
    code: 'Feature',
    subCode: 'API',
    description: 'Developing the API functionality.',
  },
  {
    id: '0010' as ProjectId,
    code: 'Support',
    subCode: 'API',
    description: 'Help customers with API usage.',
  },
].map(p => new Project(p))
