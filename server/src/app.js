import cors from 'cors'
import express from 'express'
import { rateLimit } from 'express-rate-limit'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { corsOrigins, env } from './config/env.js'
import { prisma } from './database/client.js'
import AgentController from './controllers/AgentController.js'
import ArticleController from './controllers/ArticleController.js'
import AutomationController from './controllers/AutomationController.js'
import CustomerController from './controllers/CustomerController.js'
import DepartmentController from './controllers/DepartmentController.js'
import ReportController from './controllers/ReportController.js'
import TeamController from './controllers/TeamController.js'
import TicketController from './controllers/TicketController.js'
import WorkspaceController from './controllers/WorkspaceController.js'
import errorHandler from './middleware/errorHandler.js'
import notFound from './middleware/notFound.js'
import requestId from './middleware/requestId.js'
import CustomerModel from './models/CustomerModel.js'
import ReportModel from './models/ReportModel.js'
import TicketModel from './models/TicketModel.js'
import agentRoutes from './routes/agentRoutes.js'
import articleRoutes from './routes/articleRoutes.js'
import automationRoutes from './routes/automationRoutes.js'
import customerRoutes from './routes/customerRoutes.js'
import departmentRoutes from './routes/departmentRoutes.js'
import reportRoutes from './routes/reportRoutes.js'
import teamRoutes from './routes/teamRoutes.js'
import ticketRoutes from './routes/ticketRoutes.js'
import CustomerService from './services/CustomerService.js'
import ReportService from './services/ReportService.js'
import TicketService from './services/TicketService.js'
import HttpError from './utils/HttpError.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function createApp({ prismaClient = prisma, database, services = {}, logger = env.NODE_ENV !== 'test' } = {}) {
  const client = database || prismaClient
  const app = express()
  app.disable('x-powered-by')
  app.locals.prisma = client

  app.use(requestId)
  app.use(helmet({ 
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false
  }))

  const allowedOriginsList = Array.isArray(corsOrigins)
    ? corsOrigins
    : typeof corsOrigins === 'string'
      ? corsOrigins.split(',').map(s => s.trim())
      : []

  app.use(cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOriginsList.includes('*') ||
        allowedOriginsList.includes(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')
      ) {
        return callback(null, true)
      }
      return callback(new HttpError(403, 'CORS_ORIGIN_DENIED'))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-workspace-id'],
  }))

  app.use(express.json({ limit: '10mb' }))
  if (logger) app.use(morgan('dev'))

  app.get('/health', (_request, response) => response.json({ status: 'ok' }))
  app.use('/api/v1', rateLimit({ windowMs: env.RATE_LIMIT_WINDOW_MS, limit: env.RATE_LIMIT_MAX, standardHeaders: true, legacyHeaders: false }))

  const ticketService = services.ticket || new TicketService(new TicketModel(client))
  const customerService = services.customer || new CustomerService(new CustomerModel(client))
  const reportService = services.report || new ReportService(new ReportModel(client))
  const agentController = new AgentController(client)
  const teamController = new TeamController(client)
  const departmentController = new DepartmentController(client)
  const articleController = new ArticleController(client)
  const automationController = new AutomationController(client)
  const workspaceController = new WorkspaceController(client)

  // API Routes
  app.use('/api/v1/tickets', ticketRoutes(new TicketController(ticketService)))
  app.use('/api/v1/customers', customerRoutes(new CustomerController(customerService)))
  app.use('/api/v1/reports', reportRoutes(new ReportController(reportService)))
  app.use('/api/v1/agents', agentRoutes(agentController))
  app.use('/api/v1/teams', teamRoutes(teamController))
  app.use('/api/v1/departments', departmentRoutes(departmentController))
  app.use('/api/v1/articles', articleRoutes(articleController))
  app.use('/api/v1/automations', automationRoutes(automationController))

  // Workspace, notifications, activity, settings, auth
  app.get('/api/v1/notifications', workspaceController.listNotifications)
  app.get('/api/v1/activity', workspaceController.listActivity)
  app.post('/api/v1/activity', workspaceController.recordActivity)
  app.get('/api/v1/settings', workspaceController.getSettings)
  app.patch('/api/v1/settings', workspaceController.updateSettings)
  app.get('/api/v1/auth/me', workspaceController.me)
  app.post('/api/v1/auth/login', workspaceController.login)
  app.post('/api/v1/auth/logout', workspaceController.logout)
  app.post('/api/v1/tickets/:id/attachments', workspaceController.addAttachment)

  // ========================================================
  // SERVE FRONTEND (DIST FOLDER - EXPRESS V5 COMPATIBLE)
  // ========================================================
  const potentialDistPaths = [
    path.resolve(__dirname, '../../dist'),
    path.resolve(__dirname, '../../client/dist'),
    path.resolve(__dirname, '../../frontend/dist'),
    path.resolve(__dirname, '../dist')
  ]

  const activeDist = potentialDistPaths.find(p => fs.existsSync(p))

  if (activeDist) {
    console.log(`✓ Production Frontend connected from: ${activeDist}`)
    app.use(express.static(activeDist))

    // Express v5 compatible Catch-All middleware
    app.use((req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next()
      }
      res.sendFile(path.join(activeDist, 'index.html'))
    })
  } else {
    app.use(notFound)
  }

  app.use(errorHandler)
  return app
}