import { createApp } from './app.js'
import { env } from './config/env.js'
import { connectDatabase, disconnectDatabase, prisma } from './database/client.js'

try {
  console.log('Connecting to database...')
  await connectDatabase()
  console.log('✓ Database connected successfully!')

  const app = createApp({ prismaClient: prisma })
  const server = app.listen(env.PORT, () => {
    console.log(`Support Desk API listening on http://localhost:${env.PORT}`)
  })

  server.on('error', (err) => {
    console.error('Server error:', err)
  })

  server.on('close', () => {
    console.log('Server socket closed!')
  })

  function shutdown(signal) {
    console.log(`Shutdown triggered by: ${signal}`)
    server.close(() => {
      disconnectDatabase(prisma).finally(() => process.exit(0))
    })
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err)
  })

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason)
  })

  process.on('exit', (code) => {
    console.log(`Process exited with code: ${code}`)
  })
} catch (error) {
  console.error('Fatal startup error:', error)
}