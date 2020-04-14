import { Config } from "./config";
import { Table } from "./models";

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
      this.config.tableConfigs['labels']
    );
    this.projectGroupTable = new Table(
      this.spreadSheetId,
      this.config.tableConfigs['projectGroups']
    );
    this.projectTable = new Table(
      this.spreadSheetId,
      this.config.tableConfigs['projects']
    );
    this.scheduleTable = new Table(
      this.spreadSheetId,
      this.config.tableConfigs['schedules']
    );
  }

  public onEdit(event: any) {
    Logger.log(`on Edit: event value: ${event.value}`);
    if (!!event.value) {
      return;
    }
    let range: GoogleAppsScript.Spreadsheet.Range = event["range"];

    let table = this.getTableFromRange(range);
    if (table == null) {
      Logger.log(`on Edit: table is null`);
      return;
    }

    Logger.log(`on Edit: table: ${table.sheetName}`);
    if (table.sheetName === this.scheduleTable.sheetName) {
      let editedColName = table.headers[range.getColumn() - 1];
      if (editedColName === "name") {
        let record = table.findRecordWithRowNumber(range.getRow());
        if (record.hasPrimaryKey()) {
          return;
        }
        record.values[table.primaryKey] = Utilities.getUuid();
        record.save();
      }
    }
  }

  public addSchedule(schedule: Object) {
    schedule['id'] = Utilities.getUuid();
    schedule['start'] = moment().format('YYYY/MM/DD');
    schedule['end'] = moment().add(1, 'month').format('YYYY/MM/DD');
    this.scheduleTable.addRecord(schedule);
    return schedule;
  }

  public updateSchedule(schedule: Object) {
    let record = this.scheduleTable.findRecordByPrimaryKey(schedule['id']);
    if(!record) {
      new Error(`record not found: ${schedule['id']}`);
    }
    Object.keys(schedule).forEach((k)=>{
      record.values[k] = schedule[k];
    });
    Logger.log(`app updateSchedule: record.values: ${JSON.stringify(record.values)}`);
    this.scheduleTable.saveRecord(record);
    return schedule;
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

export function initSheetListApp(spreadSheetId: string): App {
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
      this.config.tableConfigs['sheets']
    );
  }
}
