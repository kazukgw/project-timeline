import {Config} from "./config";
import {Table} from "./models";

export function initApp(spreadSheetId: string): App {
  Logger.log(`Init App`);
  let config = new Config(spreadSheetId, CONFIG_SHEET, CONFIG_CELL);
  let app = new App(config);

  Logger.log(`Init App successfully`);
  return app;
}

export class App {
  readonly config: Config;
  readonly spreadSheetId: string;
  readonly spreadSheet: GoogleAppsScript.Spreadsheet.Spreadsheet;

  readonly labelTable: Table;
  readonly projectGroupTable: Table;
  readonly projectTable: Table;
  readonly scheduleTable: Table;

  constructor(config: Config) {
    this.config = config;
    this.spreadSheetId = this.config.spreadSheetId;
    this.spreadSheet = SpreadsheetApp.openById(this.config.spreadSheetId);

    this.labelTable = new Table(
      this.spreadSheetId,
      this.config.tableConfigs["labels"]
    );
    this.projectGroupTable = new Table(
      this.spreadSheetId,
      this.config.tableConfigs["projectGroups"]
    );
    this.projectTable = new Table(
      this.spreadSheetId,
      this.config.tableConfigs["projects"]
    );
    this.scheduleTable = new Table(
      this.spreadSheetId,
      this.config.tableConfigs["schedules"]
    );
  }

  public addSchedule(schedule: Object) {
    schedule["_id"] = Utilities.getUuid();
    schedule["start"] = moment(schedule["start"]).format("YYYY/MM/DD");
    schedule["end"] = schedule["end"]
      ? moment(schedule["end"]).format("YYYY/MM/DD")
      : moment()
        .add(1, "month")
        .format("YYYY/MM/DD");
    this.scheduleTable.addRecord(schedule);
    return schedule;
  }

  public updateSchedule(schedule: Object) {
    if (!schedule["_id"]) {
      new Error(`record has no primary key: ${schedule["_id"]}`);
    }
    let record = this.scheduleTable.findRecordByPrimaryKey(schedule["_id"]);
    if (!record) {
      new Error(`record not found: ${schedule["_id"]}`);
    }
    Object.keys(schedule).forEach(k => {
      record.values[k] = schedule[k];
    });
    Logger.log(
      `app updateSchedule: record.values: ${JSON.stringify(record.values)}`
    );
    this.scheduleTable.saveRecord(record);
    return schedule;
  }

  public addProject(project: Object) {
    this.projectTable.addRecord(project);
    return project;
  }

  public updateProject(project: Object) {
    let record = this.projectTable.findRecordByPrimaryKey(project["name"]);
    if (!record) {
      new Error(`record not found: ${project["name"]}`);
    }
    Object.keys(project).forEach(k => {
      record.values[k] = project[k];
    });
    Logger.log(
      `app updateProject: record.values: ${JSON.stringify(record.values)}`
    );
    this.projectTable.saveRecord(record);
    return project;
  }

  private getTableFromRange(
    range: GoogleAppsScript.Spreadsheet.Range
  ): Table | null {
    Logger.log(`getRecordFromEditEvent: event range: ${range}`);
    let sheet: GoogleAppsScript.Spreadsheet.Sheet = range.getSheet();
    let sheetId: number = sheet.getSheetId();
    switch (sheetId) {
      case this.projectGroupTable.sheetId:
        return this.projectGroupTable;
      case this.projectTable.sheetId:
        return this.projectTable;
      case this.scheduleTable.sheetId:
        return this.scheduleTable;
    }
    return null;
  }
}

export function initSheetListApp(spreadSheetId: string): SheetListApp {
  Logger.log(`Init SheetListApp`);
  let config = new Config(spreadSheetId, CONFIG_SHEET, CONFIG_CELL);
  let app = new SheetListApp(config);

  Logger.log(`Init App successfully`);
  return app;
}

export class SheetListApp {
  readonly config: Config;
  readonly spreadSheetId: string;
  readonly spreadSheet: GoogleAppsScript.Spreadsheet.Spreadsheet;

  readonly sheetTable: Table;

  constructor(config: Config) {
    this.config = config;
    this.spreadSheetId = this.config.spreadSheetId;
    this.spreadSheet = SpreadsheetApp.openById(this.config.spreadSheetId);

    this.sheetTable = new Table(
      this.spreadSheetId,
      this.config.tableConfigs["sheets"]
    );
  }
}
