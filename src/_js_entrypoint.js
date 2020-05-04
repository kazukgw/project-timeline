let gs = google.script;
var REQUEST_URL;
var visTL;

$(() => {
  REQUEST_URL = JSON.parse($("#data-requestUrl").text())["requestUrl"];

  let rpcClient = new RPCClient(gs);
  let visTLData = new VisTLData(rpcClient);
  let $visTLContainer = $("#vistl-container");

  let sheetList = JSON.parse($("#data-sheet-list").text());
  visTLData.initializeData(sheetList).then(() => {
    visTL = new VisTL(REQUEST_URL, rpcClient, visTLData);
    visTL.create($visTLContainer.get(0));

    setTimeout(() => {
      $visTLContainer.find("#spinner-wrapper").remove();
      if(visTL.defaultRange) {
        if(visTL.defaultRange['start']) {
          visTL.visTL.setWindow(
            new Date(visTL.defaultRange.start),
            new Date(visTL.defaultRange.end)
          );
        }
      } else if(visTL.defaultDuration) {
        var m = visTL.defaultDuration.match(/^[0-9]+/);
        if(m) {
          var k;
          k = ((k = visTL.defaultDuration.match(/[a-z]+$/)) && k[0]) || "month";
          var dur = moment.duration(moment().diff(moment().subtract(m[0], k)));
          var start = moment().subtract(dur.asSeconds()/5, 'seconds');
          var end = moment().add(4 * dur.asSeconds()/5, 'seconds');
          visTL.visTL.setWindow(start, end);
        }
      } else {
        visTL.visTL.setWindow(
          moment().subtract(2, "month"),
          moment().add(10, "month")
        );
      }

      new UI(visTL).init();
    }, 1000);
  });
});

function inflateJson(data) {
  return JSON.parse(pako.inflate(atob(data), { to: "string" }));
}

function deflateJson(data) {
  return btoa(pako.deflate(JSON.stringify(data), { to: "string" }));
}
