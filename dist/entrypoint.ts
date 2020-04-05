import { App, initApp } from "./app";
import * as moment from 'moment';

function doGet(e: GoogleAppsScript.Events.AppsScriptHttpRequestEvent) {
  let params = e.parameters;
  Logger.log(`doGet: params: ${params}`)
  let template = HtmlService.createTemplateFromFile("index");
  let selfId = SpreadsheetApp.getActive().getId();
  sheetIdList = params['sheet'] || [];
  if(sheetIdList.indexOf(selfId) === -1) {
    sheetIdList.push(selfId);
  }
  template.sheetIdList = JSON.stringify(sheetIdList);
  return template.evaluate();
}

function onEdit(event: any) {
  let app = initApp(null);
  app.onEdit(event);
}

function resetTriggers() {
  let triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }

  var sheet = SpreadsheetApp.getActive();
  ScriptApp.newTrigger("onEdit")
    .forSpreadsheet(sheet)
    .onEdit()
    .create();
}

function rpc(functionName: string, paramJson: string, spreadSheetId: string) {
  return new RPCHandler(functionName, paramJson, spreadSheetId).handle();
}

class RPCHandler {
  private functionName: string;
  private paramObject: Object;
  private app: App;

  constructor(functionName: string, paramJson: string, spreadSheetId: string) {
    Logger.log(
      `init rpc handler: functionName: ${functionName}, paramJson: ${paramJson}`
    );
    this.functionName = functionName;
    this.paramObject = paramJson == null ? null : JSON.parse(paramJson);
    this.app = initApp(spreadSheetId);
  }

  handle(): string {
    let func = this[this.functionName];
    if (func == null) {
      Logger.log(`handle rpc: function ${this.functionName} not found`);
      new Error(`function (${this.functionName}) not found`);
    }
    return JSON.stringify(func.call(this, this.paramObject));
  }

  private getAllData(): Object {
    return {
      projectGroups: this.app.projectGroupTable.getAllRecordData(),
      labels: this.app.labelTable.getAllRecordData(),
      projects: this.app.projectTable.getAllRecordData(),
      schedules: this.app.scheduleTable.getAllRecordData()
    };
  }

  private updateSchedule(schedule: Object) {
    Logger.log(`updateSchedule: schedule`);
    let record = this.app.scheduleTable.findRecordByPrimaryKey(
      schedule[this.app.scheduleTable.primaryKey]
    );
    record.values["start"] = moment(
      schedule["start"].replace("Z", ""),
      moment.HTML5_FMT.DATETIME_LOCAL_MS
    )
      .add(9, "hours")
      .format("YYYY/MM/DD");

    if (schedule["type"] != "point") {
      record.values["end"] = moment(
        schedule["end"].replace("Z", ""),
        moment.HTML5_FMT.DATETIME_LOCAL_MS
      )
        .add(9, "hours")
        .format("YYYY/MM/DD");
    }

    Logger.log(`updateSchedule: try record.save`);
    record.save();
  }
}
