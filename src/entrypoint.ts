import {App, initApp} from "./app";
// import * as moment from "moment";

function doGet(e: GoogleAppsScript.Events.AppsScriptHttpRequestEvent) {
  return new DoGetHandler(e).handle();
}

function rpc(functionName: string, paramJson: string) {
  return new RPCHandler(functionName, paramJson).handle();
}

class DoGetHandler {
  readonly params: Object;

  readonly title: string;
  readonly sheetIdList: Array<string>;
  readonly requestUrl: string;

  constructor(e: GoogleAppsScript.Events.AppsScriptHttpRequestEvent) {
    this.params = e.parameters;
    Logger.log(`doGet: params: ${JSON.stringify(this.params)}`);

    this.title = this.params["title"] || "Project Roadmap";
    this.sheetIdList = this.params["sheet"] || [];
    this.requestUrl = `${ScriptApp.getService().getUrl()}?${e.queryString}`;
  }

  handle() {
    if (this.sheetIdList.length < 1) {
      return this.showSheetListPage();
    }

    return this.showProjectTimelinePage();
  }

  private showSheetListPage() {
    let template = HtmlService.createTemplateFromFile("_index");
    // @ts-ignore
    let app: SheetListApp = initSheetListApp(SHEET_LIST_SHEET_ID);
    let sheetData = app.sheetTable.getAllRecordData();
    let sheetList = sheetData.map((s: Object) => {
      return {id: s['id'], name: s['name'], url: s['url']};
    });

    template.title = this.title;
    template.scriptWebAppUrl = JSON.stringify({
      url: ScriptApp.getService().getUrl()
    });
    template.sheetList = JSON.stringify(sheetList);
    template.sheetListSheetName = app.spreadSheet.getName();
    template.sheetListSheetURL = app.spreadSheet.getUrl();

    return this.setOutputOption(template.evaluate());
  }

  private showProjectTimelinePage() {
    let template = HtmlService.createTemplateFromFile("_project_timeline");
    let sheetList = this.sheetIdList.map(id => {
      var sheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
      try {
        sheet = SpreadsheetApp.openById(id);
      } catch (e) {
        return null;
      }
      return {id: id, name: sheet.getName(), url: sheet.getUrl()};
    }).filter((d) => {return d != null});

    template.title = this.title;
    template.sheetList = JSON.stringify(sheetList);
    template.requestUrl = JSON.stringify({requestUrl: this.requestUrl});

    return this.setOutputOption(template.evaluate());
  }

  private setOutputOption(
    output: GoogleAppsScript.HTML.HtmlOutput
  ): GoogleAppsScript.HTML.HtmlOutput {
    output.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    output.setSandboxMode(HtmlService.SandboxMode.IFRAME);
    return output;
  }
}
