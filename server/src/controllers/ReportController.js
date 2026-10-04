import asyncHandler from '../utils/asyncHandler.js'

export default class ReportController {
  constructor(reportService) {
    this.summary = asyncHandler(async (_request, response) => {
      const data = await reportService.summary()
      response.json({ data })
    })
  }
}