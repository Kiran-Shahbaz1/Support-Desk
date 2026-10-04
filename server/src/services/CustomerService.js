export default class CustomerService {
  constructor(customerModel) {
    this.customerModel = customerModel
  }

  async list() {
    return this.customerModel.list()
  }

  async create(data) {
    return this.customerModel.create(data)
  }
}