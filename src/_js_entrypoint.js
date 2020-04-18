let gs = google.script;
var REQUEST_URL;

$(() => {
  REQUEST_URL = JSON.parse($("#data-requestUrl").text())["requestUrl"];

  let rpcClient = new RPCClient(gs);
  let visTLData = new VisTLData(rpcClient);
  let visTL;

  let sheetList = JSON.parse($("#data-sheet-list").text());
  visTLData.initializeData(sheetList).then(() => {
    visTL = new VisTL(REQUEST_URL, rpcClient, visTLData);
    visTL.create(document.getElementById("vistl-container"));

    setTimeout(() => {
      visTL.visTL.setWindow(
        moment().subtract(2, "month"),
        moment().add(10, "month")
      );

      new UI(visTL).init();
    }, 1000);
  });
});

function inflateJson(data) {
  return pako.inflate(atob(data), { to: "string" });
}

function deflateJson(data) {
  return pako.deflate(JSON.stringify(data), { to: "string" });
}
