import { env } from '../config/env.js'

export default function errorHandler(error, request, response, _next) {
  const status = Number(error.status) || 500
  const code = error.code || (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR')
  if (status >= 500) console.error({ requestId: request.id, error })
  response.status(status).json({
    error: {
      code,
      message: status >= 500 && env.NODE_ENV === 'production' ? 'An unexpected server error occurred.' : error.message,
      requestId: request.id,
      ...(error.details ? { details: error.details } : {}),
    },
  })
}