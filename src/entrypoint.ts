import { App, initApp } from "./app";
import * as moment from 'moment';

// TODO: doGet のハンドラはクラスを用意する
function doGet(e: GoogleAppsScript.Events.AppsScriptHttpRequestEvent) {
  let params = e.parameters;
  Logger.log(`doGet: params: ${JSON.stringify(params)}`);

  let title = params['title'] || 'Project Roadmap';
  let sheetIdList: Array<string> = params['sheet'] || [];
  let requestUrl = ScriptApp.getService().getUrl() + '?' + e.queryString;

  // TODO: template 経由 で client に json で渡すデータは単一のオブジェクトにまとめる
  if(sheetIdList.length < 1) {
    let template = HtmlService.createTemplateFromFile("index");
    template.title = title;
    let app:SheetListApp = initSheetListApp(SHEET_LIST_SHEET_ID);
    let sheetData = app.sheetTable.getAllRecordData();
    let sheetList = sheetData.map((s)=>{
      let sheet = SpreadsheetApp.openById(s.id);
      return {
        id: s.id,
        name: sheet.getName(),
        url: sheet.getUrl()
      }
    });
    template.scriptWebAppUrl = JSON.stringify({url: ScriptApp.getService().getUrl()});
    template.sheetList = JSON.stringify(sheetList);
    template.sheetListSheetName = app.spreadSheet.getName();
    template.sheetListSheetURL = app.spreadSheet.getUrl();
    let output = template.evaluate();
    output.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    output.setSandboxMode(HtmlService.SandboxMode.IFRAME);
    return output;
  }

  let template = HtmlService.createTemplateFromFile("project_timeline.html");
  let sheetList = sheetIdList.map((id)=>{
    let sheet = SpreadsheetApp.openById(id);
    return {
      id: id,
      name: sheet.getName(),
      url: sheet.getUrl()
    }
  });
  template.title = title;
  template.sheetList = JSON.stringify(sheetList);
  template.requestUrl = JSON.stringify({ requestUrl: requestUrl});
  let output = template.evaluate();
  output.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  output.setSandboxMode(HtmlService.SandboxMode.IFRAME);
  return output;
}

function rpc(functionName: string, paramJson: string) {
  return new RPCHandler(functionName, paramJson).handle();
}

