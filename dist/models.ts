export class TableRecord {
  public table: Table;
  public range: GoogleAppsScript.Spreadsheet.Range;
  public values: Object;

  constructor(table: Table, range: GoogleAppsScript.Spreadsheet.Range) {
    this.table = table;
    this.range = range;
    let rangeVals = this.range.getValues()[0];
    let values = {};
    this.table.headers.forEach((k: string, i: number) => {
      values[k] = rangeVals[i];
    });
    this.values = values;
  }

  public hasPrimaryKey(): boolean {
    let primaryKey = this.values[this.table.primaryKey];
    Logger.log(`hasPrimaryKey: ${primaryKey}`);
    return !!primaryKey;
  }

  public save() {
    this.range.setValues([this.valueArray()]);
  }

  private valueArray(): Array<any> {
    let valueAry: Array<any> = [];
    let values = this.values;
    this.table.headers.forEach((k: string) => {
      valueAry.push(values[k]);
    });
    Logger.log(`valueArray: ${valueAry}`);
    return valueAry;
  }
}

export class Table {
  readonly spreadSheetId: string;
  readonly spreadSheetObj: GoogleAppsScript.Spreadsheet.Spreadsheet;
  readonly sheetName: string;
  readonly sheetId: number;
  readonly headers: Array<string>;
  readonly primaryKey: string;

  private headerRangeFirstRowNumber: number;
  private recordRangeFirstRowNumber: number;
  private sheetObj: GoogleAppsScript.Spreadsheet.Sheet;
  private primaryKeyColumnNumber: number;

  constructor(
    sheetName: string,
    headerRangeFirstRowNumber: number,
    recordRangeFirstRowNumber: number,
    primaryKey: string,
    spreadSheetId: string
  ) {
    if(spreadSheetId != null) {
      this.spreadSheetId = spreadSheetId;
      this.spreadSheetObj = SpreadsheetApp.openById(this.spreadSheetId);
    } else {
      this.spreadSheetObj = SpreadsheetApp.getActive();
      this.spreadSheetId = this.spreadSheetObj.getId();
    }
    this.sheetName = sheetName;
    this.sheetObj = this.spreadSheetObj.getSheetByName(sheetName);
    this.sheetId = this.sheetObj.getSheetId();
    this.headerRangeFirstRowNumber = headerRangeFirstRowNumber;
    this.recordRangeFirstRowNumber = recordRangeFirstRowNumber;
    this.primaryKey = primaryKey;

    // header の数は最大 20
    let headers = <Array<string>>(
      this.sheetObj.getRange(headerRangeFirstRowNumber, 1, 1, 20).getValues()[0]
    );
    this.headers = [];
    headers.forEach(v => {
      if (v !== undefined && v !== "") this.headers.push(v);
    });

    let index = this.headers.indexOf(primaryKey);
    if (index === -1) {
      new Error(`${sheetName} の primaryKey:${primaryKey} が存在しません`);
    }
    this.primaryKeyColumnNumber = index + 1;
  }

  public newRecordWithRowNumber(rowNumber: number) {
    let range = this.sheetObj.getRange(rowNumber, 1, 1, this.headers.length);
    return new TableRecord(this, range);
  }

  public getAllRecordData(): Array<Object> {
    let allRecordRange = this.getAllRecordRange();
    let headers = this.headers;
    Logger.log(`getAllRecordData: headers: ${headers}`);
    return this.getRecordDataFromRange(allRecordRange);
  }

  public getAllRecords(): Array<TableRecord> {
    let lastRowNumber = this.getLastRowNumber();
    let rows = [];
    for (var i = this.recordRangeFirstRowNumber; i <= lastRowNumber; i++) {
      let record = new TableRecord(this, this.getRangeByRowNumber(i));
      if (record.hasPrimaryKey()) {
        rows.push(record);
      }
    }
    return rows;
  }

  public findRecordByPrimaryKey(key: string): TableRecord | null {
    Logger.log(`findRecordByPrimaryKey: ${this.sheetName} primaryKey: ${key}`);
    let range = this.findRangeByPrimaryKey(key);
    // Logger.log(`findRecordByPrimaryKey: range: ${range}`);
    if (range == null) {
      return null;
    }
    return new TableRecord(this, range);
  }

  private getLastRowNumber(): number {
    let range = this.getPrimaryKeyColRange();
    Logger.log(
      `getLastRecordRowNumber: range.getLastRow: ${range.getLastRow()}`
    );
    return range.getLastRow() + this.recordRangeFirstRowNumber - 1;
  }

  private getAllRecordRange(): GoogleAppsScript.Spreadsheet.Range {
    let lastRowNumber = this.getLastRowNumber();
    return this.sheetObj.getRange(
      this.recordRangeFirstRowNumber,
      1,
      lastRowNumber - this.recordRangeFirstRowNumber + 1,
      this.headers.length
    );
  }

  private getRecordDataFromRange(
    range: GoogleAppsScript.Spreadsheet.Range
  ): Array<Object> {
    let headers = this.headers;
    return range
      .getValues()
      .map((recordDataArray: Array<any>) => {
        let data = {};
        recordDataArray.forEach((v: any, i: number) => {
          data[headers[i]] = v;
        });
        return data;
      })
      .filter(v => !!v[this.primaryKey]);
  }

  private getRangeByRowNumber(
    rowNumber: number
  ): GoogleAppsScript.Spreadsheet.Range {
    return this.sheetObj.getRange(rowNumber, 1, 1, this.headers.length);
  }

  private findRangeByPrimaryKey(
    key: string
  ): GoogleAppsScript.Spreadsheet.Range {
    Logger.log(`findRangeByPrimaryKey: ${this.sheetName} key: ${key}`)
    let pkColRange = this.getPrimaryKeyColRange();
    Logger.log(`findRangeByPrimaryKey: pkColRange: ${pkColRange.getA1Notation()}`);
    let textFinder = pkColRange.createTextFinder(key);
    let range = textFinder.findNext();
    if (range == null) {
      return null;
    }
    return this.sheetObj.getRange(range.getRow(), 1, 1, this.headers.length);
  }

  private getPrimaryKeyColRange(): GoogleAppsScript.Spreadsheet.Range {
    return this.sheetObj.getRange(
      this.recordRangeFirstRowNumber,
      this.primaryKeyColumnNumber,
      (this.sheetObj.getLastRow() - this.recordRangeFirstRowNumber) + 1,
      1
    );
  }
}
