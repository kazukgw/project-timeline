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
