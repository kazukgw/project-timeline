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

  public getPrimaryKey(): boolean {
    let primaryKey = this.values[this.table.primaryKey];
    Logger.log(`getPrimaryKey: ${primaryKey}`);
    return primaryKey;
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

export class TableConfig {
  readonly sheetName: string;
  readonly headerRangeFirstRowNumber: number;
  readonly recordRangeFirstRowNumber: number;
  readonly primaryKey: string;

  constructor(
    sheetName: string,
    headerRangeFirstRowNumber: number,
    recordRangeFirstRowNumber: number,
    primaryKey: string
  ) {
    this.sheetName = sheetName;
    this.headerRangeFirstRowNumber = headerRangeFirstRowNumber;
    this.recordRangeFirstRowNumber = recordRangeFirstRowNumber;
    this.primaryKey = primaryKey;
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
    spreadSheetId: string,
    tableConfig: TableConfig
  ) {
    this.spreadSheetId = spreadSheetId;
    this.spreadSheetObj = SpreadsheetApp.openById(this.spreadSheetId);
    this.sheetName = tableConfig.sheetName;
    this.sheetObj = this.spreadSheetObj.getSheetByName(this.sheetName);
    this.sheetId = this.sheetObj.getSheetId();
    this.headerRangeFirstRowNumber = tableConfig.headerRangeFirstRowNumber;
    this.recordRangeFirstRowNumber = tableConfig.recordRangeFirstRowNumber;
    this.primaryKey = tableConfig.primaryKey;

    // header の数は最大 20
    let headers = <Array<string>>(
      this.sheetObj.getRange(this.headerRangeFirstRowNumber, 1, 1, 20).getValues()[0]
    );
    this.headers = [];
    headers.forEach(v => {
      if (v !== undefined && v !== "") this.headers.push(v);
    });

    let index = this.headers.indexOf(this.primaryKey);
    if (index === -1) {
      new Error(`${this.sheetName} の primaryKey:${this.primaryKey} が存在しません`);
    }
    this.primaryKeyColumnNumber = index + 1;
  }

  public addRecord(recordData: Object) {
    let lck = LockService.getScriptLock();
    if(lck.tryLock(10000)) {
      let lastRowNumber = this.getLastRowNumber();
      Logger.log(`addRecord: lastRowNumber: ${lastRowNumber}`);
      this.sheetObj.insertRowAfter(lastRowNumber);
      let range = this.sheetObj.getRange(lastRowNumber + 1, 1, 1, this.headers.length);
      let values = this.headers.map((h)=>{ return recordData[h] });
      Logger.log(`addRecord: values: ${JSON.stringify(values)}`);
      range.setValues([values]);
      lck.releaseLock()
    } else {
      new Error('faild to get script lock');
    }
  }

  public saveRecord(record: TableRecord): TableRecord {
    let lck = LockService.getScriptLock();
    var rec: TableRecord;
    if(lck.tryLock(10000)) {
      let rec = this.findRecordByPrimaryKey(record.getPrimaryKey());
      if(!rec) {
        new Error(`record not found: ${record.getPrimaryKey()}`);
      }
      rec.values = record.values;
      rec.save();
      lck.releaseLock();
    }
    return rec;
  }

  public findRecordWithRowNumber(rowNumber: number) {
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
    // Logger.log(`getLastRecordRowNumber: range.getLastRow: ${range.getLastRow()}`);
    var lastRowNumber: number = this.recordRangeFirstRowNumber;
    range.getValues().forEach((v, i)=>{
      if(!!v[0]) {
        lastRowNumber = (this.recordRangeFirstRowNumber * 1) + i;
      }
      // Logger.log(`getLastRowNumber: lastRowNumber: ${lastRowNumber}`)
    });
    return lastRowNumber;
    // return (range.getLastRow() * 1) + (this.recordRangeFirstRowNumber * 1) - 1;
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
    var rowNum = (this.sheetObj.getLastRow() - this.recordRangeFirstRowNumber) + 1;
    rowNum = rowNum < 1 ? 1 : rowNum;
    return this.sheetObj.getRange(
      this.recordRangeFirstRowNumber,
      this.primaryKeyColumnNumber,
      rowNum,
      1
    );
  }
}
