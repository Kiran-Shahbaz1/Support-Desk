import HttpError from '../utils/HttpError.js'

export default function validateRequest(schemas) {
  return function validate(request, _response, next) {
    const validated = {}
    for (const [section, schema] of Object.entries(schemas)) {
      const result = schema.safeParse(request[section])
      if (!result.success) {
        return next(new HttpError(400, 'VALIDATION_ERROR', 'Request validation failed.', result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))))
      }
      validated[section] = result.data
    }
    request.validated = validated
    next()
  }
}