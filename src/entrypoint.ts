import { App, initApp } from "./app";
import * as moment from 'moment';

function doGet(e: GoogleAppsScript.Events.AppsScriptHttpRequestEvent) {
  let params = e.parameters;
  Logger.log(`doGet: params: ${JSON.stringify(params)}`);

  let title = params['title'] || 'Project Roadmap';
  let sheetIdList: Array<string> = params['sheet'] || [];

  if(sheetIdList.length < 1) {
    let template = HtmlService.createTemplateFromFile("index");
    template.title = title;
    let app:SheetListApp = initSheetListApp(SHEET_LIST_SHEET_ID);
    let sheetData = app.sheetTable.getAllRecordData();
    let sheetList = sheetData.map((s)=>{
      let sheet = SpreadsheetApp.openById(s.id);
      return {
        id: s.id,
        name: sheet.getName(),
        url: sheet.getUrl()
      }
    });
    template.scriptWebAppUrl = JSON.stringify({url: ScriptApp.getService().getUrl()});
    template.sheetList = JSON.stringify(sheetList);
    template.sheetListSheetName = app.spreadSheet.getName();
    template.sheetListSheetURL = app.spreadSheet.getUrl();
    let output = template.evaluate();
    output.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    return output;
  }

  let template = HtmlService.createTemplateFromFile("project_timeline.html");
  let sheetList = sheetIdList.map((id)=>{
    let sheet = SpreadsheetApp.openById(id);
    return {
      id: id,
      name: sheet.getName(),
      url: sheet.getUrl()
    }
  });
  template.title = title;
  template.sheetList = JSON.stringify(sheetList);
  let output = template.evaluate();
  output.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  return output;
}

function onEdit(event: any) {
  let app = initApp(null);
  app.onEdit(event);
}
function resetTriggers() { let triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }

  var sheet = SpreadsheetApp.getActive();
  ScriptApp.newTrigger("onEdit")
    .forSpreadsheet(sheet)
    .onEdit()
    .create();
}

function rpc(functionName: string, paramJson: string) {
  return new RPCHandler(functionName, paramJson).handle();
}

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

  private updateSchedule(schedule: Object) {
    Logger.log(`updateSchedule: schedule`);
    let sheetId = schedule['sheetId'];
    if(!!sheetId) {
      new Error('sheetId is null');
    }
    let app = initApp(sheetId);
    let record = app.scheduleTable.findRecordByPrimaryKey(
      schedule[app.scheduleTable.primaryKey]
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

  private addSchedule(schedule: Object) {
    Logger.log(`addSchedule: schedule`);
    let sheetId = schedule['sheetId'];
    if(!!sheetId) {
      new Error('sheetId is null');
    }
    let app = initApp(sheetId);
    return app.addSchedule(schedule);
  }
}
