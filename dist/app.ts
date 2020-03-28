class App {
  readonly config: Config;
  readonly groupTable: Table;
  readonly projectTable: Table;
  readonly scheduleTable: Table;

  constructor(config: Config) {
    this.config = config;
    this.groupTable = new Table(
      config.groupSheetName,
      config.groupSheetHeaderRangeFirstRowNumber,
      config.groupSheetRecordRangeFirstRowNumber,
      config.groupPrimaryKey
    );

    this.projectTable = new Table(
      config.projectSheetName,
      config.projectSheetHeaderRangeFirstRowNumber,
      config.projectSheetRecordRangeFirstRowNumber,
      config.projectPrimaryKey
    );

    this.scheduleTable = new Table(
      config.scheduleSheetName,
      config.scheduleSheetHeaderRangeFirstRowNumber,
      config.scheduleSheetRecordRangeFirstRowNumber,
      config.schedulePrimaryKey
    );
  }

  public onEdit(event) {
    Logger.log(`on Edit: event value: ${event.value}`);
    if (isBlank(event.value)) {
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
    var table: Table;
    switch (sheetId) {
      case this.groupTable.sheetId:
        return this.groupTable;
      case this.projectTable.sheetId:
        return this.projectTable;
      case this.scheduleTable.sheetId:
        return this.scheduleTable;
    }
    return null;
  }
}
