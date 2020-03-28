const _org_log = Logger.log;
function initDebugLogger() {
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

function includeHtml(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function deleteAllTriggers() {
  let triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }

  // onEdit という関数は自動でトリガ設定されるので手動での設定は不要
  //
  // var sheet = SpreadsheetApp.getActive();
  // ScriptApp.newTrigger('onEdit')
  //   .forSpreadsheet(sheet)
  //   .onEdit()
  //   .create();
}

function isBlank(val) {
  return val == null || val === "";
}
