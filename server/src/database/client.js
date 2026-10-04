import { PrismaClient } from '@prisma/client'
import { env } from '../config/env.js'

export const prisma = new PrismaClient()

export async function connectDatabase(client = prisma) {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required. Set it in server/.env before starting the API.')
  }
  await client.$connect()
  return client
}

export async function disconnectDatabase(client = prisma) {
  await client.$disconnect()
}