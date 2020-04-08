import { Config } from "./config";
import { Table } from "./models";

const _org_log = Logger.log;
function initDebugLogger() {
  // @ts-ignore
  Logger.log = function(message: any) {
    _org_log(message);
    LOG_SHEET.appendRow([
      new Date(),
      Session.getActiveUser().getEmail(),
      message
    ]);
    let delteNum: number = LOG_SHEET.getMaxRows() - LOG_MAX_ROWS;
    if (delteNum > 0) {
      LOG_SHEET.deleteRows(2, delteNum);
    }
  };
}

const CONFIG_SHEET = 'Config';
const CONFIG_CELL = 'A3';

export function initApp(spreadSheetId: string): App {
  if (DEBUG) {
    initDebugLogger();
  }
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

  readonly timeMarkerTable: Table;
  readonly labelTable: Table;
  readonly projectGroupTable: Table;
  readonly projectTable: Table;
  readonly scheduleTable: Table;

  constructor(config: Config) {
    this.config = config;
    this.spreadSheetId = this.config.spreadSheetId;

    this.timeMarkerTable = new Table(
      this.spreadSheetId,
      this.config.tableConfigs['timeMarkers']
    );
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
        let record = table.newRecordWithRowNumber(range.getRow());
        if (record.hasPrimaryKey()) {
          return;
        }
        record.values[table.primaryKey] = Utilities.getUuid();
        record.save();
      }
    }
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
