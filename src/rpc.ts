class RPCHandler {
  private functionName: string;
  private paramObject: Object;

  constructor(functionName: string, paramJson: string) {
    Logger.log(
      `init rpc handler: functionName: ${functionName}, paramJson: ${paramJson}`
    );
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
    let sheetId = param["sheetId"];
    if (!!sheetId) {
      new Error("sheetId is null");
    }
    // @ts-ignore
    let app = initApp(sheetId);

    // TODO: リファクタ: こんなところでレコードの値を変更するな
    // NOTE: データ取得時にSchedules シートの条件にマッチするレコードについては PrimaryKey をセットする
    let records = app.scheduleTable.getAllRecordsHasNoPrimaryKey();
    // @ts-ignore
    records.forEach((r: TableRecord) => {
      if (!r.hasPrimaryKey() && r.values["name"] != null && r.values["name"] !== "") {
        r.values["_id"] = Utilities.getUuid();
        r.save();
      }
    });

    return {
      labels: app.labelTable.getAllRecordData(),
      projectGroups: app.projectGroupTable.getAllRecordData(),
      projects: app.projectTable.getAllRecordData(),
      schedules: app.scheduleTable.getAllRecordData()
    };
  }

  private sort(param: Object) {
    // @ts-ignore
    let app = initApp(param["sheetId"]);

    switch (param["sheetName"].toLowerCase()) {
      case "schedules":
        app.scheduleTable.sort([
          {column: "project", ascending: true},
          {column: "start", ascending: true},
        ]);
        return;
      case "projects":
        app.projectTable.sort([
          {column: "projectGroup", ascending: true}
        ]);
        return;
    }
  }

  private addSchedule(schedule: Object) {
    Logger.log(`addSchedule: schedule`);
    let sheetId = schedule["sheetId"];
    if (!!sheetId) {
      new Error("sheetId is null");
    }
    // @ts-ignore
    let app = initApp(sheetId);
    return app.addSchedule(schedule);
  }

  private updateSchedule(schedule: Object) {
    Logger.log(`updateSchedule: schedule`);
    let sheetId = schedule["sheetId"];
    if (!!sheetId) {
      new Error("sheetId is null");
    }
    // @ts-ignore
    let app = initApp(sheetId);
    return app.updateSchedule(schedule);
  }

  private addProject(project: Object) {
    Logger.log(`addSchedule: schedule`);
    let sheetId = project["sheetId"];
    if (!!sheetId) {
      new Error("sheetId is null");
    }
    // @ts-ignore
    let app = initApp(sheetId);
    return app.addProject(project);
  }

  private updateProject(project: Object) {
    Logger.log(`updateSchedule: schedule`);
    let sheetId = project["sheetId"];
    if (!!sheetId) {
      new Error("sheetId is null");
    }
    // @ts-ignore
    let app = initApp(sheetId);
    return app.updateProject(project);
  }
}
