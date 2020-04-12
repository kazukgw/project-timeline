import { TableConfig } from "./models";

export class Config {
  readonly sheetName: string;
  readonly spreadSheetId: string;
  readonly configValueCellA1Notation: string;
  readonly rawConfig: string;

  readonly spreadSheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  readonly sheet: GoogleAppsScript.Spreadsheet.Sheet;

  readonly tableConfigs: Object;

  constructor(
    spreadSheetId: string,
    sheetName: string,
    configValueCellA1Notation: string
  ) {
    this.spreadSheetId = spreadSheetId;
    this.sheetName = sheetName;
    this.configValueCellA1Notation = configValueCellA1Notation;

    this.spreadSheet = SpreadsheetApp.openById(this.spreadSheetId);
    this.sheet = this.spreadSheet.getSheetByName(this.sheetName);

    this.rawConfig = this.sheet.getRange(this.configValueCellA1Notation).getValue();

    let config = JSON.parse(this.rawConfig);

    let tables: Object = config['tables'];
    if(!!tables) {
      new Error('config must has tables');
    }

    this.tableConfigs = {};
    Object.keys(tables).forEach((k)=>{
      let t = tables[k];
      this.tableConfigs[k] = new TableConfig(
        t['sheetName'],
        t['headerRangeFirstRowNumber'],
        t['recordRangeFirstRowNumber'],
        t['primaryKey']
      );
    });
  }
}
