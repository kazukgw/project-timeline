let gs = google.script;

$(()=>{
  let rpcClient = new RPCClient(gs);
  let visTLData = new VisTLData(rpcClient);
  let visTL;

  let sheetList = JSON.parse($('#data-sheet-list').text());
  visTLData.initializeData(sheetList)
    .then(()=>{
      visTL = new VisTL(rpcClient, visTLData);
      visTL.create(document.getElementById("vistl-container"));

      setTimeout(()=>{
        visTL.visTL.setWindow(
          moment().subtract(2, 'month'),
          moment().add(10, 'month')
        );

        (new UI(visTL)).init();
      }, 1000);
    });
});
