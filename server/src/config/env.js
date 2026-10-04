import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://127.0.0.1:5173,http://localhost:5175,http://127.0.0.1:5175'),
  DATABASE_URL: z.string().url().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
})

const result = envSchema.safeParse(process.env)
if (!result.success) {
  throw new Error(`Invalid server environment: ${z.prettifyError(result.error)}`)
}

export const env = result.data
export const corsOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)