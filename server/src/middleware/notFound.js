import HttpError from '../utils/HttpError.js'

export default function notFound(request, _response, next) {
  next(new HttpError(404, 'NOT_FOUND', `Route ${request.method} ${request.originalUrl} was not found.`))
}