class RPCHandler {
  private functionName: string;
  private paramObject: Object;

  constructor(functionName: string, paramJson: string) {
    Logger.log(
      `init rpc handler: functionName: ${functionName}, paramJson: ${paramJson}`);
    this.functionName = functionName;
    this.paramObject = paramJson == null ? null : JSON.parse(paramJson);
  }

  handle(): string {
    let func = this[this.functionName];
    if (func == null) {
      Logger.log(`handle rpc: function ${this.functionName} not found`);
      new Error(`function (${this.functionName}) not found`);
    }
    return JSON.stringify(func.call(this, this.paramObject));
  }

  private getAllData(param: Object): Object {
    let sheetId = param['sheetId'];
    if(!!sheetId) {
      new Error('sheetId is null');
    }
    let app = initApp(sheetId);

    return {
      labels: app.labelTable.getAllRecordData(),
      projectGroups: app.projectGroupTable.getAllRecordData(),
      projects: app.projectTable.getAllRecordData(),
      schedules: app.scheduleTable.getAllRecordData()
    };
  }

  private addSchedule(schedule: Object) {
    Logger.log(`addSchedule: schedule`);
    let sheetId = schedule['sheetId'];
    if(!!sheetId) {
      new Error('sheetId is null');
    }
    let app = initApp(sheetId);
    return app.addSchedule(schedule);
  }

  // TODO: serializable な データ用クラスを利用するように変更する
  private updateSchedule(schedule: Object) {
    Logger.log(`updateSchedule: schedule`);
    let sheetId = schedule['sheetId'];
    if(!!sheetId) {
      new Error('sheetId is null');
    }
    let app = initApp(sheetId);
    return app.updateSchedule(schedule);
  }
}