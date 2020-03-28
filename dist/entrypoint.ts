const DEBUG = false;

function doGet() {
  return HtmlService.createTemplateFromFile("index").evaluate();
}

function getAllResources(sheetName) {
  let app = initApp();
  return JSON.stringify({
    groups: app.groupTable.getAllRecordData(),
    projects: app.projectTable.getAllRecordData(),
    schedules: app.scheduleTable.getAllRecordData()
  });
}

function updateSchedule(scheduleJson) {
  let app = initApp();
  Logger.log(`updateSchedule: scheduleJson: ${scheduleJson}`);
  let schedule = JSON.parse(scheduleJson);
  let record = app.scheduleTable.findRecordByPrimaryKey(
    schedule[app.scheduleTable.primaryKey]
  );
  record.values.start = moment(
    schedule.start.replace("Z", ""),
    moment.HTML5_FMT.DATETIME_LOCAL_MS
  )
    .add(9, "hours")
    .format("YYYY/MM/DD");
  record.values.end = moment(
    schedule.end.replace("Z", ""),
    moment.HTML5_FMT.DATETIME_LOCAL_MS
  )
    .add(9, "hours")
    .format("YYYY/MM/DD");
  Logger.log(`updateSchedule: try record.save`);
  record.save();
}

function onEdit(event) {
  let app = initApp();
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

// ---------------------------------------------------

const CONFIG_SHEET_NAME = "Config";
const LOG_SHEET_NAME = "Log";
const LOG_SHEET = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
  LOG_SHEET_NAME
);
const LOG_MAX_ROWS = 2000;

function initApp(): App {
  if (DEBUG) {
    initDebugLogger();
  }
  Logger.log(`Init App`);
  let config = new Config(CONFIG_SHEET_NAME, 2, 3, "key");
  let app = new App(config);

  Logger.log(`Init App successfully`);
  return app;
}

class Config {
  public groupSheetName: string;
  public groupSheetHeaderRangeFirstRowNumber: number;
  public groupSheetRecordRangeFirstRowNumber: number;
  public groupPrimaryKey: string;

  public projectSheetName: string;
  public projectSheetHeaderRangeFirstRowNumber: number;
  public projectSheetRecordRangeFirstRowNumber: number;
  public projectPrimaryKey: string;

  public scheduleSheetName: string;
  public scheduleSheetHeaderRangeFirstRowNumber: number;
  public scheduleSheetRecordRangeFirstRowNumber: number;
  public schedulePrimaryKey: string;

  constructor(
    sheetName: string,
    headerRangeFirstRowNumber: number,
    recordRangeFirstRowNumber: number,
    primaryKey: string
  ) {
    let configTable = new Table(
      sheetName,
      headerRangeFirstRowNumber,
      recordRangeFirstRowNumber,
      primaryKey
    );
    let records = configTable.getAllRecords();
    var configData = {};
    records.forEach((record: TableRecord, index: number) => {
      Logger.log(
        `Config record: record.values: ${JSON.stringify(record.values)}`
      );
      configData[record.values["key"]] = record.values["value"];
    });

    Logger.log(`Config constructor: configData: ${JSON.stringify(configData)}`);

    this.groupSheetName = configData["groupSheetName"];
    this.groupSheetHeaderRangeFirstRowNumber =
      configData["groupSheetHeaderRangeFirstRowNumber"];
    this.groupSheetRecordRangeFirstRowNumber =
      configData["groupSheetRecordRangeFirstRowNumber"];
    this.groupPrimaryKey = configData["groupPrimaryKey"];

    this.projectSheetName = configData["projectSheetName"];
    this.projectSheetHeaderRangeFirstRowNumber =
      configData["projectSheetHeaderRangeFirstRowNumber"];
    this.projectSheetRecordRangeFirstRowNumber =
      configData["projectSheetRecordRangeFirstRowNumber"];
    this.projectPrimaryKey = configData["projectPrimaryKey"];

    this.scheduleSheetName = configData["scheduleSheetName"];
    this.scheduleSheetHeaderRangeFirstRowNumber =
      configData["scheduleSheetHeaderRangeFirstRowNumber"];
    this.scheduleSheetRecordRangeFirstRowNumber =
      configData["scheduleSheetRecordRangeFirstRowNumber"];
    this.schedulePrimaryKey = configData["schedulePrimaryKey"];
  }
}
