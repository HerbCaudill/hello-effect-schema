import { Project, type ProjectId } from '../../schema/Project'

export const projects = `Business: Contracts	yes	Contract negotiation & other back-and-forth
Business: Marketing		Work on DevResults.com, writing blogs, creating materials, etc.
Business: Outreach	sometimes	Conferences, coffee, donuts, cold calls, etc
Business: Proposals	yes	Writing/editing proposals for specific prospects
DevOps: Azure migration		
DevOps: CI configuration		
DevOps: General		Non-project-oriented DevOps work: server/VM/database configuration, etc.
Feature: Activity-Specific Stuff		
Feature: Ag Grid conversions		
Feature: API		
Feature: Baselines		
Feature: ContentObject Validation		
Feature: Count First/Last		
Feature: Count Unique Per Reporting Period		
Feature: Dashboard		
Feature: Data Tables		
Feature: DevIndicators		
Feature: Diagnostics		
Feature: Dropbox integration		
Feature: EditGrid		
Feature: Enterprise		
Feature: Frameworks Index		2022-S01 etc
Feature: GDPR		
Feature: Google Drive integration		
Feature: Ground Truth		
Feature: IATI		
Feature: Indexify		
Feature: Instance Export		
Feature: Internal Tooling		Includes instance bootstrapper features, DevResults CLI, etc.
Feature: Localization		Includes managing LanguageStrings, getting translations, etc.
Feature: Matrix		
Feature: Metadata visualization		
Feature: Notifications		
Feature: Partner Permissions		2022 sprint 8 and associated work
Feature: PowerBI		
Feature: Project X		
Feature: Pseudonyms		
Feature: Public Site		
Feature: RDTs		
Feature: Self-serve		
Feature: Single Sign-On		, and supporting clients
Feature: Standard RP Picker		
Feature: Survey123		
Feature: SurveyCTO		
Feature: Too small to name		But you can name it in the comments!
Feature: WorldAdminDivisions update		
Out		
Overhead		General meetings, company process stuff, finance stuff, HR, onboarding, learning…
Security		All things security
Support: API	mostly	Any help provided to helping users access and use the API
Support: External tooling		Providing support for "other tools" outside of DevResults (e.g. PowerBI)
Support: Ongoing	mostly	Includes engineering support to individual clients (but not bug fixing)
Support: Scaling training & help		Videos, help materials, etc.
Support: Setup	yes	Everything before the instance goes live
Support: Training	sometimes	Training dedicated to one specific client
Tech wealth: Bug fixin		Probably mostly on call. Note feature in comments if it's a major feature fix.
Tech wealth: Other		Catch-all for general improvements to the codebase
Tech wealth: Optimization		Work to improve performance within the app
Tech wealth: TypeScript		
Tech wealth: Webpack		
Thought Leadership		`
  .trim()
  .split('\n')
  .map((line, i) => {
    const [fullCode, requiresClient, description] = line.trim().split('\t')
    const id = i.toString().padStart(3, '0') as ProjectId
    const [code, subCode] = fullCode.split(/:\s+/).map(s => s.trim().replaceAll(' ', '-'))
    return new Project({ id, code, subCode, requiresClient: requiresClient === `yes`, description })
  })
