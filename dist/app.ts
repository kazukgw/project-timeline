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

export function initApp(spreadSheetId: string): App {
  if (DEBUG) {
    initDebugLogger();
  }
  Logger.log(`Init App`);
  let config = new Config(CONFIG_SHEET_NAME, 2, 3, "key", spreadSheetId);
  let app = new App(config);

  Logger.log(`Init App successfully`);
  return app;
}

export class App {
  readonly config: Config;
  readonly timeMarkerTable: Table;
  readonly labelTable: Table;
  readonly projectGroupTable: Table;
  readonly projectTable: Table;
  readonly scheduleTable: Table;
  readonly spreadSheetId: string;

  constructor(config: Config) {
    this.config = config;
    this.spreadSheetId = this.config.spreadSheetId;

    this.timeMarkerTable = new Table(
      config.timeMarkerSheetName,
      config.timeMarkerSheetHeaderRangeFirstRowNumber,
      config.timeMarkerSheetRecordRangeFirstRowNumber,
      config.timeMarkerPrimaryKey,
      this.spreadSheetId
    );

    this.labelTable = new Table(
      config.labelSheetName,
      config.labelSheetHeaderRangeFirstRowNumber,
      config.labelSheetRecordRangeFirstRowNumber,
      config.labelPrimaryKey,
      this.spreadSheetId
    );

    this.projectGroupTable = new Table(
      config.projectGroupSheetName,
      config.projectGroupSheetHeaderRangeFirstRowNumber,
      config.projectGroupSheetRecordRangeFirstRowNumber,
      config.projectGroupPrimaryKey,
      this.spreadSheetId
    );

    this.projectTable = new Table(
      config.projectSheetName,
      config.projectSheetHeaderRangeFirstRowNumber,
      config.projectSheetRecordRangeFirstRowNumber,
      config.projectPrimaryKey,
      this.spreadSheetId
    );

    this.scheduleTable = new Table(
      config.scheduleSheetName,
      config.scheduleSheetHeaderRangeFirstRowNumber,
      config.scheduleSheetRecordRangeFirstRowNumber,
      config.schedulePrimaryKey,
      this.spreadSheetId
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
    if (table.sheetName === this.config.scheduleSheetName) {
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
