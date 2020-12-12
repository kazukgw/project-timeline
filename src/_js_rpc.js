class RPCClient {
  constructor(gs) {
    this.gs = gs;
  }

  getAllData(sheetIdList) {
    let gs = this.gs;
    let promises = sheetIdList.map((sheetId) => {
      return new Promise((resolve, _) => {
        gs.run
          .withSuccessHandler((dataFromGAS) => {
            let d = {
              sheetId: sheetId,
              data: JSON.parse(dataFromGAS),
            };
            // console.log(`getAllData: ${sheetId}: data: ${dataFromGAS}`);
            resolve(d);
          })
          .withFailureHandler((error) => {
            alert("データ取得に失敗しました: " + error);
            resolve(null);
          })
          .rpc("getAllData", JSON.stringify({sheetId: sheetId}));
      });
    });
    return Promise.all(promises);
  }

  sort(sheetId, sheetName) {
    let gs = this.gs;
    return new Promise((resolve, reject) => {
      gs.run
        .withSuccessHandler(() => {
          console.log(`sort: ${sheetId}.${sheetName} sorted sucessfully`);
          resolve();
        })
        .withFailureHandler((error) => {
          console.log(`failed to sort: error: ${error}`);
          reject();
        })
        .rpc(
          "sort",
          JSON.stringify({sheetId: sheetId, sheetName: sheetName})
        );
    });
  }

  addSchedule(schedule) {
    let gs = this.gs;
    let estimated_start = schedule["estimated_start"]
      ? moment(schedule.estimated_start).format("YYYY/MM/DD")
      : null;
    let estimated_end = schedule["estimated_end"]
      ? moment(schedule.estimated_end).format("YYYY/MM/DD")
      : null;
    var start;
    if (schedule.start != null && estimated_start) {
      start = estimated_start;
    } else {
      start = moment(schedule.start).format("YYYY/MM/DD");
    }
    var end;
    if (schedule.end != null && estimated_end) {
      end = estimated_end;
    } else {
      end = moment(schedule.end).format("YYYY/MM/DD");
    }
    return new Promise((resolve, reject) => {
      var scheduleJson = JSON.stringify({
        sheetId: schedule.sheetId,
        type: schedule.type,
        name: schedule.name,
        link: schedule.link,
        task: schedule.task,
        assignee: schedule.assignee,
        project: schedule.project,
        projectGroup: schedule.projectGroup,
        color: schedule.color,
        start: start,
        description: schedule.description,
        end: end,
        estimated_start: estimated_start,
        estimated_end: estimated_end,
        editable: true,
      });
      gs.run
        .withSuccessHandler((scheduleHasId) => {
          console.log("addSchedule: create sucessfully");
          console.log(`addSchedule: ${scheduleHasId}`);
          resolve(JSON.parse(scheduleHasId));
        })
        .withFailureHandler((error) => {
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
        : moment().add(1, "month").format("YYYY/MM/DD");
      let estimated_start = schedule["estimated_start"]
        ? moment(schedule.estimated_start).format("YYYY/MM/DD")
        : null;
      let estimated_end = schedule["estimated_end"]
        ? moment(schedule.estimated_end).format("YYYY/MM/DD")
        : null;
      var scheduleJson = JSON.stringify({
        sheetId: schedule.sheetId,
        _id: schedule._id,
        task: schedule.task,
        type: schedule.type,
        index: schedule.index,
        name: schedule.name,
        description: schedule.description,
        assignee: schedule.assignee,
        progress: schedule.progress,
        project: schedule.project,
        projectGroup: schedule.projectGroup,
        color: schedule.color,
        link: schedule.link,
        archive: schedule.archive,
        invalid: schedule.invalid,
        start: start,
        end: end,
        estimated_start: estimated_start,
        estimated_end: estimated_end,
        editable: true,
      });
      gs.run
        .withSuccessHandler((schedule) => {
          console.log("updateSchedule: update sucessfully");
          resolve(JSON.parse(schedule));
        })
        .withFailureHandler((error) => {
          console.log(`updateSchedule: failed to update: error: ${error}`);
          reject();
        })
        .rpc("updateSchedule", scheduleJson);
    });
  }

  addProject(project) {
    let gs = this.gs;
    return new Promise((resolve, reject) => {
      var projectJson = JSON.stringify({
        sheetId: project.sheetId,
        name: project.name,
        assignee: project.assignee,
        projectGroup: project.projectGroup,
        lable: project.label,
        color: project.color,
      });
      gs.run
        .withSuccessHandler((projectHasId) => {
          console.log("addProject: create sucessfully");
          console.log(`addProject: ${projectHasId}`);
          resolve(JSON.parse(projectHasId));
        })
        .withFailureHandler((error) => {
          console.log(`failed to create: error: ${error}`);
          reject();
        })
        .rpc("addProject", projectJson);
    });
  }

  updateProject(project) {
    let gs = this.gs;
    return new Promise((resolve, reject) => {
      var projectJson = JSON.stringify({
        sheetId: project.sheetId,
        name: project.name,
        assignee: project.assignee,
        projectGroup: project.projectGroup,
        lable: project.label,
        color: project.color,
        index: project.index,
        archive: project.archive,
      });
      gs.run
        .withSuccessHandler((project) => {
          console.log("updateProject: update sucessfully");
          resolve(JSON.parse(project));
        })
        .withFailureHandler((error) => {
          console.log(`updateProject: failed to update: error: ${error}`);
          reject();
        })
        .rpc("updateProject", projectJson);
    });
  }
}
