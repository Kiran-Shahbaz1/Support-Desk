import asyncHandler from '../utils/asyncHandler.js'

export default class CustomerController {
  constructor(customerService) {
    this.list = asyncHandler(async (_request, response) => {
      const data = await customerService.list()
      response.json({ data })
    })

    this.create = asyncHandler(async (request, response) => {
      const data = await customerService.create(request.body)
      response.status(201).json({ data })
    })
  }
}