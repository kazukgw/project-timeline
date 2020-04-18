class RPCClient {
  constructor(gs) {
    this.gs = gs;
  }

  getAllData(sheetIdList) {
    let gs = this.gs;
    let promises = sheetIdList.map(sheetId => {
      return new Promise((resolve, reject) => {
        gs.run
          .withSuccessHandler(dataFromGAS => {
            let d = {
              sheetId: sheetId,
              data: JSON.parse(dataFromGAS)
            };
            // console.log(`getAllData: ${sheetId}: data: ${dataFromGAS}`);
            resolve(d);
          })
          .withFailureHandler(error => {
            alert("データ取得に失敗しました: " + error);
            resolve(null);
          })
          .rpc("getAllData", JSON.stringify({ sheetId: sheetId }));
      });
    });
    return Promise.all(promises);
  }

  addSchedule(schedule) {
    let gs = this.gs;
    let start = moment(schedule.start).format("YYYY/MM/DD");
    let end = moment(schedule.end).format("YYYY/MM/DD");
    return new Promise((resolve, reject) => {
      var scheduleJson = JSON.stringify({
        sheetId: schedule.sheetId,
        type: schedule.type,
        name: schedule.name,
        link: schedule.link,
        assignee: schedule.assignee,
        project: schedule.project,
        projectGroup: schedule.projectGroup,
        start: start,
        end: end,
        editable: true
      });
      gs.run
        .withSuccessHandler(scheduleHasId => {
          console.log("addSchedule: create sucessfully");
          console.log(`addSchedule: ${scheduleHasId}`);
          resolve(JSON.parse(scheduleHasId));
        })
        .withFailureHandler(error => {
          console.log(`failed to create: error: ${error}`);
          reject();
        })
        .rpc("addSchedule", scheduleJson);
    });
  }

  updateSchedule(schedule) {
    let gs = this.gs;
    return new Promise((resolve, reject) => {
      let start = schedule.start
        ? moment(schedule.start).format("YYYY/MM/DD")
        : moment().format("YYYY/MM/DD");
      let end = schedule.end
        ? moment(schedule.end).format("YYYY/MM/DD")
        : moment()
            .add(1, "month")
            .format("YYYY/MM/DD");
      var scheduleJson = JSON.stringify({
        sheetId: schedule.sheetId,
        _id: schedule._id,
        type: schedule.type,
        name: schedule.name,
        assignee: schedule.assignee,
        progress: schedule.progress,
        project: schedule.project,
        projectGroup: schedule.projectGroup,
        link: schedule.link,
        start: start,
        end: end,
        editable: true
      });
      gs.run
        .withSuccessHandler(schedule => {
          console.log("updateSchedule: update sucessfully");
          resolve(JSON.parse(schedule));
        })
        .withFailureHandler(error => {
          console.log(`updateSchedule: failed to update: error: ${error}`);
          reject();
        })
        .rpc("updateSchedule", scheduleJson);
    });
  }
}
