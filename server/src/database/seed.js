import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedDatabase(client = prisma) {
  console.log('Seeding MySQL database...')

  // Roles
  const roles = [
    { id: 'role-admin', name: 'Administrator', description: 'Full workspace access and management' },
    { id: 'role-agent', name: 'Agent', description: 'Handle and resolve customer tickets' },
    { id: 'role-manager', name: 'Manager', description: 'Oversee queues, SLA, and workloads' },
    { id: 'role-customer', name: 'Customer', description: 'Submit tickets and view own updates' },
  ]
  for (const role of roles) {
    await client.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    })
  }

  // Users
  const users = [
    { id: 'user-admin', name: 'Workspace administrator', email: 'admin@supportdesk.io', passwordHash: 'demo-hash', status: 'ACTIVE' },
    { id: 'user-kiran', name: 'Kiran Shah', email: 'kiran.shah@supportdesk.io', passwordHash: 'demo-hash', status: 'ACTIVE' },
    { id: 'user-ahmed', name: 'Ahmed Khan', email: 'ahmed.khan@supportdesk.io', passwordHash: 'demo-hash', status: 'ACTIVE' },
    { id: 'user-sara', name: 'Sara Davis', email: 'sara.davis@supportdesk.io', passwordHash: 'demo-hash', status: 'ACTIVE' },
    { id: 'user-maya', name: 'Maya Patel', email: 'maya.patel@supportdesk.io', passwordHash: 'demo-hash', status: 'ACTIVE' },
  ]
  for (const user of users) {
    await client.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    })
  }

  // Departments
  const departments = [
    { id: 'dept-core', name: 'Core support', description: 'General support questions and triage' },
    { id: 'dept-finance', name: 'Finance support', description: 'Billing, invoices, and accounting support' },
    { id: 'dept-enterprise', name: 'Enterprise', description: 'SSO, compliance, and dedicated accounts' },
    { id: 'dept-data', name: 'Data support', description: 'Analytics, data sync, and reports' },
  ]
  for (const dept of departments) {
    await client.department.upsert({
      where: { name: dept.name },
      update: {},
      create: dept,
    })
  }

  // Teams
  const teams = [
    { id: 'team-core', name: 'Core support', description: 'Tier 1 support queue', departmentId: 'dept-core' },
    { id: 'team-enterprise', name: 'Enterprise', description: 'Enterprise customer desk', departmentId: 'dept-enterprise' },
    { id: 'team-data', name: 'Data support', description: 'Analytics triage desk', departmentId: 'dept-data' },
    { id: 'team-leadership', name: 'Leadership', description: 'Support leadership and escalations', departmentId: 'dept-core' },
  ]
  for (const team of teams) {
    await client.team.upsert({
      where: { name: team.name },
      update: {},
      create: team,
    })
  }

  // Agents
  const agents = [
    { id: 'agent-kiran', userId: 'user-kiran', teamId: 'team-leadership', departmentId: 'dept-core', title: 'Administrator' },
    { id: 'agent-ahmed', userId: 'user-ahmed', teamId: 'team-core', departmentId: 'dept-core', title: 'Support agent' },
    { id: 'agent-sara', userId: 'user-sara', teamId: 'team-enterprise', departmentId: 'dept-enterprise', title: 'Support agent' },
    { id: 'agent-maya', userId: 'user-maya', teamId: 'team-leadership', departmentId: 'dept-core', title: 'Manager' },
  ]
  for (const agent of agents) {
    await client.agent.upsert({
      where: { id: agent.id },
      update: {},
      create: agent,
    })
  }

  // Customers
  const customers = [
    { id: 'cust-maya', name: 'Maya Chen', email: 'maya.chen@acme.co', company: 'Acme Corp' },
    { id: 'cust-theo', name: 'Theo Martin', email: 'theo.martin@northwind.io', company: 'Northwind' },
    { id: 'cust-priya', name: 'Priya Nair', email: 'priya.nair@contoso.com', company: 'Contoso' },
    { id: 'cust-jon', name: 'Jon Bell', email: 'jon.bell@globex.com', company: 'Globex' },
    { id: 'cust-owen', name: 'Owen Wilson', email: 'owen.wilson@example.com', company: 'Example Inc' },
  ]
  for (const cust of customers) {
    await client.customer.upsert({
      where: { id: cust.id },
      update: {},
      create: cust,
    })
  }

  // Articles
  const articles = [
    { id: 'article-sso', title: 'Configure SSO for your workspace', category: 'Security', body: 'Configure SAML metadata and role mapping in workspace security settings.', reads: 128 },
    { id: 'article-members', title: 'Invite and manage workspace members', category: 'Workspace', body: 'Invite teammates and assign the correct workspace role.', reads: 94 },
    { id: 'article-invoices', title: 'Understanding invoice export formats', category: 'Billing', body: 'Choose a supported export format from the billing reports page.', reads: 76 },
  ]
  for (const art of articles) {
    await client.article.upsert({
      where: { id: art.id },
      update: {},
      create: art,
    })
  }

  // Settings
  await client.setting.upsert({
    where: { key: 'workspace_settings' },
    update: {},
    create: {
      key: 'workspace_settings',
      value: JSON.stringify({ email: true, realtime: true, sla: true }),
    },
  })

  // Automation Rules
  const rules = [
    { id: 'rule-escalate', name: 'Escalate critical tickets', triggerType: 'priority-critical', actionType: 'assign-manager', active: true, conditions: {}, action: { label: 'Assign to Support Manager + notify' } },
    { id: 'rule-sla', name: 'SLA risk alert', triggerType: 'sla-under-hour', actionType: 'notify-assignee', active: true, conditions: {}, action: { label: 'Notify assignee + manager' } },
    { id: 'rule-close', name: 'Close resolved tickets', triggerType: 'resolved-seven-days', actionType: 'archive-ticket', active: false, conditions: {}, action: { label: 'Archive ticket' } },
  ]
  for (const r of rules) {
    await client.automationRule.upsert({
      where: { id: r.id },
      update: {},
      create: r,
    })
  }

  // Tags
  const tagNames = ['SLA risk', 'Invoice', 'Invite', 'Workspace', 'SSO', 'Enterprise', 'Data', 'Analytics', 'Incident', 'How-to']
  for (const name of tagNames) {
    await client.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }

  // Tickets
  const ticketCount = await client.ticket.count()
  if (ticketCount === 0) {
    const ticketFixtures = [
      {
        id: 1042,
        subject: 'Invoice export returns a blank PDF',
        customerId: 'cust-maya',
        description: 'The finance team receives a blank PDF when exporting the monthly invoice report.',
        module: 'Billing',
        category: 'Billing report',
        priority: 'CRITICAL',
        status: 'OPEN',
        assigneeAgentId: 'agent-kiran',
        assigneeLabel: 'Kiran Shah',
        departmentId: 'dept-finance',
        departmentLabel: 'Finance support',
        teamId: 'team-core',
        teamLabel: 'Core support',
        channel: 'EMAIL',
        sla: '00:42 left',
        tags: ['SLA risk', 'Invoice'],
        comments: [],
        activities: ['Ticket created via email', 'Priority raised to Critical'],
      },
      {
        id: 1041,
        subject: 'Cannot invite a new workspace member',
        customerId: 'cust-theo',
        description: 'The invite button spins indefinitely for a new workspace member.',
        module: 'Workspace',
        category: 'Member access',
        priority: 'HIGH',
        status: 'PENDING',
        assigneeAgentId: 'agent-ahmed',
        assigneeLabel: 'Ahmed Khan',
        departmentId: 'dept-core',
        departmentLabel: 'Core support',
        teamId: 'team-core',
        teamLabel: 'Core support',
        channel: 'CHAT',
        sla: '02:18 left',
        tags: ['Invite', 'Workspace'],
        comments: [{ body: 'Requested a screen recording from the customer.', visibility: 'PUBLIC' }],
        activities: ['Ticket created via chat', 'Assigned to Ahmed Khan'],
      },
      {
        id: 1040,
        subject: 'SSO setup questions for the finance team',
        customerId: 'cust-priya',
        description: 'Customer needs guidance for configuring SAML metadata and role mapping.',
        module: 'Security',
        category: 'SSO / Identity',
        priority: 'MEDIUM',
        status: 'OPEN',
        assigneeAgentId: 'agent-sara',
        assigneeLabel: 'Sara Davis',
        departmentId: 'dept-enterprise',
        departmentLabel: 'Enterprise',
        teamId: 'team-enterprise',
        teamLabel: 'Enterprise',
        channel: 'EMAIL',
        sla: '05:40 left',
        tags: ['SSO', 'Enterprise'],
        comments: [],
        activities: ['Ticket created via email'],
      },
      {
        id: 1039,
        subject: 'Dashboard data is delayed by one hour',
        customerId: 'cust-jon',
        description: 'Analytics dashboard is showing data from the previous hour.',
        module: 'Analytics',
        category: 'Data latency',
        priority: 'HIGH',
        status: 'OPEN',
        assigneeAgentId: 'agent-kiran',
        assigneeLabel: 'Kiran Shah',
        departmentId: 'dept-data',
        departmentLabel: 'Data support',
        teamId: 'team-data',
        teamLabel: 'Data support',
        channel: 'API',
        sla: '03:11 left',
        tags: ['Analytics', 'Incident'],
        comments: [],
        activities: ['Ticket created via API', 'Tagged as Incident'],
      },
      {
        id: 1038,
        subject: 'How do I change my notification digest?',
        customerId: 'cust-owen',
        description: 'Customer asked where notification digest preferences can be changed.',
        module: 'Account',
        category: 'Notifications',
        priority: 'LOW',
        status: 'RESOLVED',
        assigneeAgentId: 'agent-ahmed',
        assigneeLabel: 'Ahmed Khan',
        departmentId: 'dept-core',
        departmentLabel: 'Core support',
        teamId: 'team-core',
        teamLabel: 'Core support',
        channel: 'WEB',
        sla: 'Closed',
        resolvedAt: new Date(),
        tags: ['How-to'],
        comments: [{ body: 'Shared the notification preferences article.', visibility: 'PUBLIC' }],
        activities: ['Ticket created via web form', 'Resolved by Ahmed Khan'],
      },
    ]

    for (const fixture of ticketFixtures) {
      const { tags, comments, activities, ...ticketData } = fixture
      const createdTicket = await client.ticket.create({
        data: ticketData,
      })

      // Link tags
      for (const tagName of tags) {
        const tag = await client.tag.findUnique({ where: { name: tagName } })
        if (tag) {
          await client.ticketTag.create({
            data: { ticketId: createdTicket.id, tagId: tag.id },
          }).catch(() => {})
        }
      }

      // Add comments
      for (const comm of comments) {
        await client.ticketComment.create({
          data: {
            ticketId: createdTicket.id,
            body: comm.body,
            visibility: comm.visibility || 'PUBLIC',
          },
        })
      }

      // Add activities
      for (const action of activities) {
        await client.ticketActivity.create({
          data: {
            ticketId: createdTicket.id,
            action,
          },
        })
      }
    }
  }

  console.log('Seeding completed successfully!')
}

if (process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .catch((error) => {
      console.error('Error seeding MySQL database:', error)
      process.exit(1)
    })
    .finally(() => prisma.$disconnect())
}
