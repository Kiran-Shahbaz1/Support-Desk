const viewAliases = new Map([
  ['dashboard', 'Overview'], ['overview', 'Overview'], ['home', 'Overview'],
  ['tickets', 'Tickets'], ['ticket', 'Tickets'],
  ['customers', 'Customers'], ['customer', 'Customers'],
  ['agents', 'Agents'], ['agent', 'Agents'],
  ['teams', 'Teams'], ['team', 'Teams'],
  ['departments', 'Departments'], ['department', 'Departments'],
  ['knowledge base', 'Knowledge Base'], ['kb', 'Knowledge Base'], ['articles', 'Knowledge Base'],
  ['automation', 'Automation'], ['automations', 'Automation'], ['rules', 'Automation'],
  ['notifications', 'Notifications'], ['alerts', 'Notifications'],
  ['reports', 'Reports'], ['report', 'Reports'], ['analytics', 'Reports'],
  ['ai assistant', 'AI Assistant'], ['assistant', 'AI Assistant'], ['ai', 'AI Assistant'],
  ['settings', 'Settings'], ['setting', 'Settings'],
  ['admin', 'Admin'],
])

const KNOWN_AGENTS = ['Kiran Shah', 'Ahmed Khan', 'Sara Davis', 'Mina Shah', 'Maya Patel']

function titleCase(value) {
  return String(value || '').replace(/\b\w/g, (c) => c.toUpperCase())
}

function stripQuotes(str) {
  if (!str) return str
  const trimmed = String(str).trim()
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function parseAttributes(input) {
  const attributes = {}
  const pattern = /([\w-]+)=(?:"([^"]*)"|'([^']*)'|([^\s]+))/g
  for (const match of input.matchAll(pattern)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4]
  }
  return attributes
}

export function parseWorkspaceCommand(rawInput) {
  const input = String(rawInput || '').trim()
  if (!input) return { type: 'empty' }

  const lower = input.toLowerCase()

  // 1. Direct "ask ..." query (Must be before navigation so "ask why is ticket open" doesn't navigate)
  const askMatch = input.match(/^ask\s+(.+)$/i)
  if (askMatch) {
    return { type: 'ask-assistant', question: askMatch[1].trim() }
  }

  // 2. Settings command (turn on / turn off)
  const settingMatch = input.match(/^(?:turn|switch)\s+(on|off)\s+(.+)$/i)
  if (settingMatch) {
    return {
      type: 'set-setting',
      name: settingMatch[2].trim(),
      enabled: settingMatch[1].toLowerCase() === 'on',
    }
  }

  // 3. Back / Clear Search
  if (/^(?:back|go back|wapis|wapas|clear|reset|all tickets|saare tickets)\b/i.test(lower)) {
    return { type: 'clear-search' }
  }

  // 4. Export / Download Report
  if (/(?:export|download|bhejo|nikalo)\s*(?:the\s*)?(?:ticket\s*)?report/i.test(lower) || /report\s*(?:download|export)/i.test(lower)) {
    return { type: 'export-report' }
  }

  // 5. Automation Execution
  if (/(?:run|execute|chalao|start)\s*(?:all\s*)?automation/i.test(lower) || /automation\s*(?:run|chalao|karo)/i.test(lower)) {
    return { type: 'run-automation' }
  }

  // 6. Notifications Clear
  if (/(?:mark|dismiss|clear|saaf|read)\s*(?:all\s*)?notification/i.test(lower) || /notification[s]?\s*(?:clear|read|hatao)/i.test(lower)) {
    return { type: 'mark-notifications-read' }
  }

  // 7. Open / Navigate Pages
  if (/(?:open|kholo|jao|go to|navigate to|show|view|dikhao|le jao)/i.test(lower)) {
    if (/create\s*ticket|new\s*ticket|ticket\s*form/i.test(lower) && !/(for|regarding|about|banao)/i.test(lower)) {
      return { type: 'open-create-ticket' }
    }
    for (const [alias, view] of viewAliases.entries()) {
      if (new RegExp(`\\b${alias}\\b`, 'i').test(lower)) {
        return { type: 'navigate', view }
      }
    }
  }

  // 8. Management: Edit / Delete Article / Team / Agent
  const editMatch = input.match(/^(?:edit|update)\s+(\w+)\s+["']?([^"']+)["']?\s*(.*)$/i)
  if (editMatch && /(article|team|agent|customer)/i.test(editMatch[1])) {
    const entity = editMatch[1].toLowerCase()
    const name = stripQuotes(editMatch[2])
    const fields = parseAttributes(editMatch[3])
    return { type: 'update', entity, name, fields }
  }

  const deleteMatch = input.match(/^(?:delete|remove)\s+(\w+)\s+["']?([^"']+)["']?$/i)
  if (deleteMatch && /(article|team|agent|customer)/i.test(deleteMatch[1])) {
    return { type: 'delete', entity: deleteMatch[1].toLowerCase(), name: stripQuotes(deleteMatch[2]) }
  }

  // 9. Natural language ticket creation (e.g. Create a high-priority ticket for Ali Khan...)
  const naturalCreateMatch = input.match(/create\s+(?:a\s+)?([a-z-]+)(?:-priority)?\s+ticket\s+for\s+(.+?)\s+regarding\s+(.+?)\s+and\s+assign\s+it\s+to\s+(.+)/i)
  if (naturalCreateMatch) {
    const pRaw = naturalCreateMatch[1].toLowerCase().replace('-priority', '')
    const priority = pRaw === 'high' ? 'high' : pRaw === 'critical' ? 'critical' : pRaw === 'low' ? 'low' : 'medium'
    return {
      type: 'create',
      entity: 'ticket',
      fields: {
        priority,
        customer: naturalCreateMatch[2].trim(),
        subject: naturalCreateMatch[3].trim(),
        assignee: naturalCreateMatch[4].trim(),
        description: naturalCreateMatch[3].trim(),
      },
    }
  }

  // 10. Check for Ticket ID anywhere (e.g. 1042, #1042)
  const idMatch = input.match(/#?(\b10\d{2,3}\b)/) || input.match(/ticket\s*#?\s*(\d+)/i)
  const ticketId = idMatch ? Number(idMatch[1]) : null

  if (ticketId) {
    if (/(?:delete|remove|hatao|mitao|khatam|uda do)/i.test(lower)) {
      return { type: 'delete-ticket', id: ticketId }
    }
    if (/(?:archive|archived)/i.test(lower)) {
      return { type: 'update-ticket', id: ticketId, fields: { archived: true, archivedAt: new Date().toISOString() } }
    }
    if (/(?:resolve|resolved|close|closed|band|solve|solved|khatam)/i.test(lower) && !/(create|banao)/i.test(lower)) {
      return { type: 'update-ticket', id: ticketId, fields: { status: 'Resolved' } }
    }
    if (/(?:update ticket)\s*#?\d+\s*status=([^\s]+)/i.test(input)) {
      const stMatch = input.match(/status=([^\s]+)/i)
      return { type: 'update-ticket', id: ticketId, fields: { status: stMatch[1] } }
    }
    if (/(?:reopen|open|khol do|dobara open)/i.test(lower) && !/(page|view|screen|kholo)/i.test(lower)) {
      return { type: 'update-ticket', id: ticketId, fields: { status: 'Open' } }
    }
    if (/(?:pending|wait|rok do)/i.test(lower)) {
      return { type: 'update-ticket', id: ticketId, fields: { status: 'Pending' } }
    }

    // Assignment
    const assignQuoteMatch = input.match(/(?:assign|reassign)\s*(?:ticket\s*)?(?:#?\d+)?\s*(?:to)?\s*["']([^"']+)["']/i)
    if (assignQuoteMatch) {
      return { type: 'assign-ticket', id: ticketId, assignee: assignQuoteMatch[1].trim() }
    }
    let foundAgent = null
    for (const agent of KNOWN_AGENTS) {
      if (new RegExp(`\\b${agent.split(' ')[0]}\\b`, 'i').test(input)) {
        foundAgent = agent
        break
      }
    }
    if (foundAgent && /(assign|dedo|de do|give|ko|transfer)/i.test(lower)) {
      return { type: 'assign-ticket', id: ticketId, assignee: foundAgent }
    }
    const assignMatch = input.match(/(?:assign|reassign|give|dedo|de do|saup do)\s*(?:ticket\s*)?(?:#?\d+)?\s*(?:to|ko)?\s*([a-zA-Z\s]+)/i) ||
                        input.match(/([a-zA-Z\s]+)\s*(?:ko)\s*(?:ticket\s*)?(?:#?\d+)?\s*(?:assign|dedo|de do)/i)
    if (assignMatch && /(assign|dedo|de do|give)/i.test(lower)) {
      const candidate = assignMatch[1].replace(/\b(ticket|to|ko|karo|krdo|please)\b/gi, '').trim()
      if (candidate.length > 2) return { type: 'assign-ticket', id: ticketId, assignee: titleCase(candidate) }
    }

    // Priority Change
    if (/(?:priority|urgent|critical|high|medium|low)/i.test(lower)) {
      const p = /(critical|urgent)/i.test(lower) ? 'Critical' : /(high)/i.test(lower) ? 'High' : /(low)/i.test(lower) ? 'Low' : 'Medium'
      return { type: 'update-ticket', id: ticketId, fields: { priority: p } }
    }

    // Subject change
    const subjChange = input.match(/(?:subject|title)\s*[:=]?\s*["']?([^"']+)["']?/i)
    if (subjChange && /(change|update|badlo|kardo|set)/i.test(lower)) {
      return { type: 'update-ticket', id: ticketId, fields: { subject: subjChange[1].replace(/(kardo|kar do|please)\b/gi, '').trim() } }
    }

    // Add comment
    const commentMatch = input.match(/(?:comment|note|likho|add comment)\s*(?:to|on)?\s*(?:ticket\s*)?(?:#?\d+)?\s*[:\-]?\s*(.+)/i)
    if (commentMatch && commentMatch[1]) {
      return { type: 'add-comment', id: ticketId, body: stripQuotes(commentMatch[1]) }
    }
  }

  // 11. Ticket Generation Check
  if (/(?:create|new|make|banao|bana do|generate|log|raise|add)\s*(?:a\s+|an\s+)?ticket/i.test(lower) || /ticket\s*(?:banao|bana do|create|generate|add)/i.test(lower)) {
    const attr = parseAttributes(input)

    if (Object.keys(attr).length > 0) {
      const fields = {
        subject: attr.subject ? stripQuotes(attr.subject) : 'Support inquiry',
        customer: attr.customer ? stripQuotes(attr.customer) : 'Valued Customer',
        description: attr.description ? stripQuotes(attr.description) : (attr.subject ? stripQuotes(attr.subject) : 'Support inquiry'),
        priority: attr.priority || 'Medium',
        assignee: attr.assignee ? stripQuotes(attr.assignee) : 'Unassigned',
      }
      return { type: 'create', entity: 'ticket', fields }
    }

    const wordsCount = input.split(/\s+/).length
    const hasDetails = attr.customer || attr.subject || /(regarding|about|for|issue|problem|masla|ka\s+ticket)/i.test(lower)

    if (wordsCount <= 3 && !hasDetails) {
      return {
        type: 'prompt-missing-data',
        entity: 'ticket',
        message: 'Ticket banane ke liye Customer Name aur Issue/Subject likhein. (Example: "Ali ka ticket banao login failed, priority High")',
      }
    }

    let priority = 'Medium'
    if (/(critical|urgent|bohot zaroori)/i.test(lower)) priority = 'Critical'
    else if (/(high)/i.test(lower)) priority = 'High'
    else if (/(low|halka)/i.test(lower)) priority = 'Low'

    let assignee = 'Unassigned'
    for (const agent of KNOWN_AGENTS) {
      if (new RegExp(`\\b${agent.split(' ')[0]}\\b`, 'i').test(input)) {
        assignee = agent
        break
      }
    }

    let customer = attr.customer || attr.for || ''
    if (!customer) {
      const custMatch = input.match(/(?:for|customer|client|user)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i) ||
                        input.match(/([a-zA-Z]+)\s+ka\s+ticket/i)
      if (custMatch) customer = custMatch[1].trim()
    }
    if (!customer) customer = 'Valued Customer'

    let subject = attr.subject || attr.title || attr.issue || ''
    if (!subject) {
      const subjMatch = input.match(/(?:regarding|about|issue|problem|subject|masla)\s+([^,.;]+)/i)
      if (subjMatch) subject = subjMatch[1].trim()
      else subject = input.replace(/(create|new|ticket|banao|bana do|urgent|high|low|critical|priority|for|ka)/gi, '').trim()
    }
    if (!subject || subject.length < 3) subject = 'Support inquiry'

    return {
      type: 'create',
      entity: 'ticket',
      fields: {
        subject: titleCase(subject),
        customer: titleCase(customer),
        description: attr.description || subject,
        priority,
        assignee,
        module: /(billing|payment|invoice)/i.test(lower) ? 'Billing' : /(login|auth|password|sso)/i.test(lower) ? 'Authentication' : 'General',
      },
    }
  }

  // 12. Agent Generation Check
  if (/(?:create|add|new|invite|banao|generate)\s*(?:a\s+|an\s+)?agent/i.test(lower) || /agent\s*(?:banao|add|create|generate)/i.test(lower)) {
    const attr = parseAttributes(input)
    const nameMatch = input.match(/(?:name|agent)\s*[:=]?\s*["']?([a-zA-Z\s]+?)["']?(?:\s+(?:role|team)\b|$)/i)
    const name = attr.name || (nameMatch ? nameMatch[1].trim() : '')

    if (!name || name.toLowerCase() === 'agent') {
      return {
        type: 'prompt-missing-data',
        entity: 'agent',
        message: 'Agent create karne ke liye Name aur Role likhein. (Example: "Create agent name=\'Hamza Shah\' role=\'Support agent\' team=\'Core support\'")',
      }
    }

    const fields = {
      name: attr.name ? stripQuotes(attr.name) : titleCase(name),
      role: attr.role ? stripQuotes(attr.role) : 'Support agent',
    }
    if (attr.team) fields.team = stripQuotes(attr.team)
    else if (!input.includes('=')) fields.team = 'Core support'

    return { type: 'create', entity: 'agent', fields }
  }

  // 13. Customer Generation Check
  if (/(?:create|add|new|banao|generate)\s*(?:a\s+|an\s+)?customer/i.test(lower) || /customer\s*(?:banao|add|create|generate)/i.test(lower)) {
    const attr = parseAttributes(input)
    const nameMatch = input.match(/(?:name|customer)\s*[:=]?\s*["']?([a-zA-Z\s]+?)["']?(?:\s+(?:email|company)\b|$)/i)
    const name = attr.name || (nameMatch ? nameMatch[1].trim() : '')

    if (!name || name.toLowerCase() === 'customer') {
      return {
        type: 'prompt-missing-data',
        entity: 'customer',
        message: 'Customer add karne ke liye Name aur Email likhein. (Example: "Create customer name=\'Usman Tariq\' email=\'usman@test.com\'")',
      }
    }

    return {
      type: 'create',
      entity: 'customer',
      fields: {
        name: titleCase(name),
        email: attr.email || `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        company: attr.company || 'Enterprise Client',
      },
    }
  }

  // 14. Team or Department Generation Check
  if (/(?:create|add|new|banao|generate)\s*(?:a\s+|an\s+)?(team|department)/i.test(lower)) {
    const entity = /department/i.test(lower) ? 'department' : 'team'
    const attr = parseAttributes(input)
    const name = attr.name || input.replace(/(create|add|new|team|department|banao|generate)/gi, '').trim()
    if (!name || name.length < 2) {
      return {
        type: 'prompt-missing-data',
        entity,
        message: `${titleCase(entity)} create karne ke liye Name bataiye. (Example: "Create ${entity} name=\'Billing Operations\'")`,
      }
    }
    return { type: 'create', entity, fields: { name: titleCase(name) } }
  }

  // 15. Search / Filtering
  if (/(?:search|find|dhoondo|dikhao|filter|show|list)\s*(?:all\s*)?tickets?/i.test(lower) || /tickets?\s*(?:dikhao|show|list)/i.test(lower)) {
    const query = input.replace(/(search|find|dhoondo|dikhao|filter|show|list|all|tickets?)/gi, '').trim()
    return { type: 'search-tickets', query: query || 'All' }
  }
  if (/(critical|high|medium|low)\s*tickets?/i.test(lower)) {
    const p = lower.match(/(critical|high|medium|low)/i)[1]
    return { type: 'search-tickets', query: `priority:${p}` }
  }
  if (/(open|pending|resolved)\s*tickets?/i.test(lower)) {
    const s = lower.match(/(open|pending|resolved)/i)[1]
    return { type: 'search-tickets', query: `status:${s}` }
  }

  // 16. Questions & Natural Queries
  if (/\?$/.test(input) || /(how many|who|what|which|total|kitne|kitna|kaun|kya|batao|status)/i.test(lower)) {
    return { type: 'ask-assistant', question: input }
  }

  // Fallback
  return { type: 'ask-assistant', question: input }
}

export function commandHelp() {
  return 'Smart AI Ready! Bolo: “Ali ka ticket banao urgent login issue”, “Create agent name=\'Zain\' role=\'Support Agent\'”, “Assign 1042 to Kiran”, “1039 resolve kardo”, “Download report”, “How many tickets are open?”'
}