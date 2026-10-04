export default class ReportService {
  constructor(reportModel) {
    this.reportModel = reportModel
  }

  async summary() {
    return this.reportModel.summary()
  }
}