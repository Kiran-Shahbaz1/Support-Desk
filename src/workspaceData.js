export const initialAgents = [
  { id: 'agent-kiran', name: 'Kiran Shah', detail: 'Administrator' },
  { id: 'agent-ahmed', name: 'Ahmed Khan', detail: 'Support agent' },
  { id: 'agent-sara', name: 'Sara Davis', detail: 'Support agent' },
]

export const initialTeams = ['Core support', 'Enterprise', 'Data support'].map((name) => ({ id: name, name, detail: 'Support team' }))
export const initialDepartments = ['Core support', 'Finance support', 'Enterprise', 'Data support'].map((name) => ({ id: name, name, detail: 'Ticket routing queue' }))
export const initialArticles = [
  { id: 'article-sso', title: 'Configure SSO for your workspace', category: 'Security', body: 'Configure SAML metadata and role mapping in workspace security settings.', reads: 128 },
  { id: 'article-members', title: 'Invite and manage workspace members', category: 'Workspace', body: 'Invite teammates and assign the correct workspace role.', reads: 94 },
  { id: 'article-invoices', title: 'Understanding invoice export formats', category: 'Billing', body: 'Choose a supported export format from the billing reports page.', reads: 76 },
]