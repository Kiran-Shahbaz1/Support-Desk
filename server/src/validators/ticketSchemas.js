import { z } from 'zod'

const status = z.enum(['Open', 'Pending', 'Resolved'])
const priority = z.enum(['Critical', 'High', 'Medium', 'Low'])

export const ticketIdSchema = z.object({ id: z.coerce.number().int().positive() })

export const ticketListSchema = z.object({
  status: status.optional(),
  priority: priority.optional(),
  assignee: z.string().trim().min(1).optional(),
  customer: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export const ticketCreateSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  customer: z.string().trim().min(1).max(160),
  email: z.union([z.string().trim().email().max(254), z.literal('')]).optional(),
  description: z.string().trim().min(1).max(10_000),
  module: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  priority: priority.default('Medium'),
  status: status.default('Open'),
  assignee: z.string().trim().max(160).optional(),
  department: z.string().trim().max(120).optional(),
  team: z.string().trim().max(120).optional(),
  channel: z.string().trim().max(60).optional(),
  sla: z.string().trim().max(100).optional(),
  dueDate: z.string().trim().max(100).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(30).optional(),
  attachments: z.array(z.string().trim().min(1).max(255)).max(20).optional(),
}).strict()

export const ticketUpdateSchema = ticketCreateSchema.partial().refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.')

export const commentCreateSchema = z.object({
  body: z.string().trim().min(1).max(10_000),
  visibility: z.enum(['public', 'internal']).default('public'),
}).strict()