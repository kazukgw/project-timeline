import { TableRecord, Table } from "./models";

export class Config {
  readonly spreadSheetId: string;

  readonly projectGroupSheetName: string;
  readonly projectGroupSheetHeaderRangeFirstRowNumber: number;
  readonly projectGroupSheetRecordRangeFirstRowNumber: number;
  readonly projectGroupPrimaryKey: string;

  readonly labelSheetName: string;
  readonly labelSheetHeaderRangeFirstRowNumber: number;
  readonly labelSheetRecordRangeFirstRowNumber: number;
  readonly labelPrimaryKey: string;

  readonly projectSheetName: string;
  readonly projectSheetHeaderRangeFirstRowNumber: number;
  readonly projectSheetRecordRangeFirstRowNumber: number;
  readonly projectPrimaryKey: string;

  readonly scheduleSheetName: string;
  readonly scheduleSheetHeaderRangeFirstRowNumber: number;
  readonly scheduleSheetRecordRangeFirstRowNumber: number;
  readonly schedulePrimaryKey: string;

  constructor(
    sheetName: string,
    headerRangeFirstRowNumber: number,
    recordRangeFirstRowNumber: number,
    primaryKey: string,
    spreadSheetId: string
  ) {
    this.spreadSheetId = spreadSheetId;
    let configTable = new Table(
      sheetName,
      headerRangeFirstRowNumber,
      recordRangeFirstRowNumber,
      primaryKey,
      spreadSheetId
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

    this.projectGroupSheetName = configData["projectGroupSheetName"];
    this.projectGroupSheetHeaderRangeFirstRowNumber =
      configData["projectGroupSheetHeaderRangeFirstRowNumber"];
    this.projectGroupSheetRecordRangeFirstRowNumber =
      configData["projectGroupSheetRecordRangeFirstRowNumber"];
    this.projectGroupPrimaryKey = configData["projectGroupPrimaryKey"];

    this.labelSheetName = configData["labelSheetName"];
    this.labelSheetHeaderRangeFirstRowNumber =
      configData["labelSheetHeaderRangeFirstRowNumber"];
    this.labelSheetRecordRangeFirstRowNumber =
      configData["labelSheetRecordRangeFirstRowNumber"];
    this.labelPrimaryKey = configData["labelPrimaryKey"];

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
