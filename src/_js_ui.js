class UI {
  constructor(visTL) {
    this.visTL = visTL;

    this.uiChangeFoldingsModal = new UIChageFoldingsModal(visTL);
    this.uiAddScheduleModal = new UIAddScheduleModal(visTL);
    this.uiEditScheduleModal = new UIEditScheduleModal(visTL);
    this.uiAddProjectModal = new UIAddProjectModal(visTL);
    this.uiEditProjectModal = new UIEditProjectModal(visTL);
    this.uiSort = new UISort(visTL);
    this.uiFilter = new UIFilter(visTL);
    this.uiGetSettingsAsUrl = new UIGetSettingsAsURLModal(visTL);
  }

  init() {
    $("#mybtn-reload").on("click", (e) => {
      $(e.currentTarget)
        .find("i")
        .removeClass("fa-repeat")
        .addClass("fa-ellipsis-h");
      this.visTL.reload().then(() => {
        $(e.currentTarget)
          .find("i")
          .removeClass("fa-ellipsis-h")
          .addClass("fa-repeat");
      });
    });

    $("#mybtn-change-foldings").on("click", () => {
      this.uiChangeFoldingsModal.show();
    });

    $("#mybtn-group-by-projectgroup").on("click", () => {
      this.visTL.resetData();
    });

    $("#mybtn-group-by-label").on("click", () => {
      this.visTL.resetDataWithLabel();
    });

    $("#mybtn-restore-hidden").on("click", () => {
      this.visTL.restoreHidden();
    });

    $("#mybtn-add-schedule").on("click", () => {
      this.uiAddScheduleModal.show();
    });

    $("#mybtn-edit-schedule").on("click", () => {
      let schedule = this.visTL.getSelectedSchedule();
      if (!schedule) {
        return;
      }
      this.uiEditScheduleModal.show(schedule);
    });

    $("#mybtn-add-project").on("click", () => {
      this.uiAddProjectModal.show();
    });

    $("#mybtn-edit-project").on("click", () => {
      let project = this.visTL.getSelectedScheduleProject();
      if (!project) {
        return;
      }
      this.uiEditProjectModal.show(project);
    });

    $("#mybtn-sort").on("click", () => {
      this.uiSort.show();
    });

    $("#mybtn-filter").on("click", () => {
      this.uiFilter.show();
    });

    $("#mybtn-get-settings-as-url").on("click", () => {
      this.uiGetSettingsAsUrl.show();
    });

    $(document).on("click", ".mybtn-hide", (e) => {
      let id = $(e.currentTarget).data("group");
      this.visTL.hideGroup(id);
    });
  }
}

class UIChageFoldingsModal {
  constructor(visTL) {
    this.visTL = visTL;
    this.$el = $("#modal-folding");

    this.$el.find(".modal-folding-button").bind("click", (e) => {
      this.changeFoldings(
        $(e.target).data("resource-type"),
        $(e.target).data("open-or-close")
      );
    });
  }

  changeFoldings(resourceType, openOrClose) {
    this.visTL.changeFoldings(resourceType, openOrClose);
    this.$el.modal("hide");
  }

  show() {
    this.$el.modal("show");
  }
}

class UIAddScheduleModal {
  constructor(visTL) {
    this.visTL = visTL;
    this.$el = $("#modal-add-schedule");

    this.$form = $("#form-add-schedule");
    this.$projectSelect = this.$el.find("#form-add-schedule-project");
    this.$taskInput = this.$el.find("#form-add-schedule-istask");
    this.$typeSelect = this.$el.find("#form-add-schedule-type");
    this.$titleInput = this.$el.find("#form-add-schedule-title");
    this.$descriptionInput = this.$el.find("#form-add-schedule-description");
    this.$assigneeInput = this.$el.find("#form-add-schedule-assignee");
    this.$linkInput = this.$el.find("#form-add-schedule-link");
    this.$colorInput = this.$el.find("#form-add-schedule-color");
    this.$startInput = this.$el.find("#form-add-schedule-start");
    this.$endInput = this.$el.find("#form-add-schedule-end");
    this.$estimatedStartInput = this.$el.find(
      "#form-add-estimated-schedule-start"
    );
    this.$estimatedEndInput = this.$el.find("#form-add-estimated-schedule-end");

    this.$addButton = this.$el.find("#form-add-schedule-button-add");

    this.$projectSelect.select2({width: "100%"});
    this.lastProjectSelectValue = null;

    this.$addButton.on("click", () => {
      this.add();
    });
  }

  add() {
    let parentId = this.$projectSelect.val();
    let parentObj =
      this.visTL.visTLData.projectGroups.get(parentId) ||
      this.visTL.visTLData.projects.get(parentId) ||
      this.visTL.visTLData.tasks.get(parentId);
    var projectGroup, project;
    if (parentObj["isProject"]) {
      projectGroup = parentObj["projectGroup"];
      project = parentObj["name"];
    } else if (parentObj["isProjectGroup"]) {
      projectGroup = parentObj["name"];
      project = null;
    }

    let start = this.$startInput.val();
    let end = this.$endInput.val();
    let estimated_start = this.$estimatedStartInput.val();
    let estimated_end = this.$estimatedEndInput.val();
    let scheduleData = {
      group: parentObj.id,
      sheetId: parentObj.sheetId,
      sheetName: parentObj.sheetName,
      sheetUrl: parentObj.sheetName,
      projectGroup: projectGroup,
      project: project,
      task: this.$taskInput.prop("checked"),
      type: this.$typeSelect.val(),
      name: this.$titleInput.val().trim(),
      description: this.$descriptionInput.val().trim(),
      link: this.$linkInput.val().trim(),
      color: this.$colorInput.val().trim(),
      assignee: this.$assigneeInput.val().trim(),
      start: start ? moment(start) : moment(),
      end: end ? moment(end) : moment().add(1, "month"),
      estimated_start: estimated_start ? moment(estimated_start) : null,
      estimated_end: estimated_end ? moment(estimated_end) : null,
    };

    if (parentId == null) {
      alert("Project を選択してください。");
      return;
    }
    if (parentObj["isProjectGroup"] && scheduleData.task) {
      alert(
        "Task を有効化した場合、Project Group を親として選択することはできません。\n Project を選択しなおしてください。"
      );
      return;
    }
    if (scheduleData.type !== "range" && scheduleData.task) {
      alert(
        "Task を有効化した場合、Schedule の Type として range 以外を選択することはできません。\n Type を選択しなおしてください。"
      );
      return;
    }

    if (scheduleData.name == null || scheduleData.name.length === "") {
      alert("Title を入力してください。");
      return;
    }

    this.$addButton.prop("disabled", true);
    this.$addButton.text("Please wait ... ");

    let scrollTop = $(window).scrollTop();
    this.visTL.addSchedule(scheduleData).then((shed) => {
      this.visTL.visTL.setSelection(shed.id);
      this.lastProjectSelectValue = this.$projectSelect.val();
      this.hide();
      setTimeout(() => {
        $(window).scrollTop(scrollTop);
      }, 300);
    });
  }

  hide() {
    this.$el.modal("hide");
  }

  show() {
    this.$projectSelect.empty();
    this.visTL.visTLData.currentVisData.visGroups.get().forEach((p) => {
      var $option;
      var text = `${p.sheetName}`;
      if (p["task"]) {
        return;
      } else if (p["isProject"]) {
        text += `/ ${p["projectGroup"]} / ${p["name"]}`;
      } else if (p["isProjectGroup"]) {
        text += `/ ${p["name"]}`;
      }
      $option = $("<option>", {
        value: p.id,
        text: text,
      });
      this.$projectSelect.append($option);
    });

    this.$projectSelect.val(this.lastProjectSelectValue).trigger("change");

    this.$addButton.text("Add");
    this.$addButton.prop("disabled", false);
    this.$el.modal("show");
  }
}

class UIEditScheduleModal {
  constructor(visTL) {
    this.visTL = visTL;
    this.$el = $("#modal-edit-schedule");

    this.schedule = null;

    this.$form = $("#form-edit-schedule");
    this.$idInput = this.$el.find("#form-edit-schedule-id");
    this.$projectSelect = this.$el.find("#form-edit-schedule-project");
    this.$taskInput = this.$el.find("#form-edit-schedule-istask");
    this.$typeSelect = this.$el.find("#form-edit-schedule-type");
    this.$titleInput = this.$el.find("#form-edit-schedule-title");
    this.$descriptionInput = this.$el.find("#form-edit-schedule-description");
    this.$assigneeInput = this.$el.find("#form-edit-schedule-assignee");
    this.$progressInput = this.$el.find("#form-edit-schedule-progress");
    this.$linkInput = this.$el.find("#form-edit-schedule-link");
    this.$colorInput = this.$el.find("#form-edit-schedule-color");
    this.$estimatedStartInput = this.$el.find(
      "#form-edit-estimated-schedule-start"
    );
    this.$estimatedEndInput = this.$el.find(
      "#form-edit-estimated-schedule-end"
    );
    this.$archiveInput = this.$el.find("#form-edit-schedule-archive");
    this.$invalidInput = this.$el.find("#form-edit-schedule-invalid");
    this.$updateButton = this.$el.find("#form-edit-schedule-button-update");

    this.$projectSelect.select2({width: "100%"});

    this.$updateButton.on("click", () => {
      this.update();
    });
  }

  update() {
    let parentId = this.$projectSelect.val();
    let g = this.visTL.visTLData.projectGroups.get(parentId);
    let p = this.visTL.visTLData.projects.get(parentId);
    let parentObj = p || g;
    let estimated_start = this.$estimatedStartInput.val();
    let estimated_end = this.$estimatedEndInput.val();

    this.schedule.group = parentObj.id;
    this.schedule.sheetId = parentObj.sheetId;
    this.schedule.sheetName = parentObj.sheetName;
    this.schedule.sheetUrl = parentObj.sheetUrl;
    this.schedule.projectGroup = parentObj["isProjectGroup"]
      ? parentObj.name
      : parentObj.projectGroupName;
    this.schedule.project = parentObj["isProjectGroup"] ? "" : parentObj.name;
    this.schedule.task = this.$taskInput.prop("checked");
    this.schedule.type = this.$typeSelect.val();
    this.schedule.name = this.$titleInput.val().trim();
    this.schedule.description = this.$descriptionInput.val().trim();
    this.schedule.assignee = this.$assigneeInput.val().trim();
    this.schedule.progress = this.$progressInput.val().trim();
    this.schedule.link = this.$linkInput.val().trim();
    this.schedule.color = this.$colorInput.val().trim();
    this.schedule.estimated_start = estimated_start
      ? moment(estimated_start)
      : null;
    this.schedule.estimated_end = estimated_end ? moment(estimated_end) : null;
    this.schedule.archive = this.$archiveInput.prop("checked");
    this.schedule.invalid = this.$invalidInput.prop("checked");

    if (parentObj["isProjectGroup"] && this.schedule.task) {
      alert(
        "Task を有効化した場合、Project Group を親として選択することはできません。\n Project を選択しなおしてください。"
      );
      return;
    }
    if (this.schedule.name == null || this.schedule.name === "") {
      alert("Title を入力してください。");
      return;
    }

    let scrollTop = $(window).scrollTop();
    this.visTL.updateSchedule(this.schedule).then((shed) => {
      this.schedule = null;
      this.visTL.visTL.setSelection(shed.id);
      this.hide();
      setTimeout(() => {
        $(window).scrollTop(scrollTop);
      }, 300);
    });

    this.$updateButton.prop("disabled", true);
    this.$updateButton.text("Please wait ... ");
  }

  hide() {
    this.$el.modal("hide");
  }

  show(schedule) {
    this.schedule = schedule;
    this.$projectSelect.empty();
    this.visTL.visTLData.currentVisData.visGroups.get().forEach((p) => {
      // sheet またぎのプロジェクトの変更はできないので 選択肢に列挙しない
      if (this.schedule.sheetId !== p.sheetId) {
        return;
      }
      var $option;
      if (p["isProject"]) {
        $option = $("<option>", {
          value: p.id,
          text: `${p.sheetName} / ${p["projectGroup"] || "<none>"} / ${p.name}`,
        });
      }
      if (p["isProjectGroup"]) {
        $option = $("<option>", {
          value: p.id,
          text: `${p.sheetName} / ${p.name}`,
        });
      }
      this.$projectSelect.append($option);
    });

    this.$idInput.val(schedule._id);

    let gId = schedule.projectGroup
      ? this.visTL.visTLData.converter.getProjectGroupId(
        schedule.sheetId,
        schedule.projectGroup
      )
      : null;
    let pId = schedule.project
      ? this.visTL.visTLData.converter.getProjectId(
        schedule.sheetId,
        schedule.project
      )
      : null;
    this.$projectSelect.val(pId || gId);
    this.$projectSelect.trigger("change");

    this.$taskInput.prop("checked", schedule.task);
    this.$typeSelect.val(schedule.type);
    this.$titleInput.val(schedule.name);
    this.$descriptionInput.val(schedule.description);
    this.$assigneeInput.val(schedule.assignee);
    this.$progressInput.val(schedule.progress);
    this.$linkInput.val(schedule.link);
    let estimated_start = schedule["estimated_start"]
      ? schedule["estimated_start"].format("YYYY-MM-DD")
      : null;
    let estimated_end = schedule["estimated_end"]
      ? schedule["estimated_end"].format("YYYY-MM-DD")
      : null;
    this.$estimatedStartInput.val(estimated_start);
    this.$estimatedEndInput.val(estimated_end);
    this.$archiveInput.prop("checked", schedule.archive);
    this.$invalidInput.prop("checked", schedule.invalid);

    this.$updateButton.text("Update");
    this.$updateButton.prop("disabled", false);
    this.$el.modal("show");
  }
}

class UIAddProjectModal {
  constructor(visTL) {
    this.visTL = visTL;
    this.$el = $("#modal-add-project");

    this.$form = $("#form-add-project");
    this.$projectGroupSelect = this.$el.find("#form-add-project-projectgroup");
    this.$nameInput = this.$el.find("#form-add-project-name");
    this.$assigneeInput = this.$el.find("#form-add-project-assignee");
    this.$colorInput = this.$el.find("#form-add-project-color");

    this.$addButton = this.$el.find("#form-add-project-button-add");

    this.$projectGroupSelect.select2({width: "100%"});
    this.lastProjectGroupSelectValue = null;

    this.$addButton.on("click", () => {
      this.add();
    });
  }

  add() {
    let parentId = this.$projectGroupSelect.val();
    let parentObj = this.visTL.visTLData.projectGroups.get(parentId);

    let projectData = {
      group: parentObj.id,
      sheetId: parentObj.sheetId,
      sheetName: parentObj.sheetName,
      sheetUrl: parentObj.sheetName,
      projectGroup: parentObj.name,
      name: this.$nameInput.val().trim(),
      assignee: this.$assigneeInput.val().trim(),
      color: this.$colorInput.val().trim(),
    };

    if (projectData.name == null || projectData.name === "") {
      alert("Name を入力してください。");
      return;
    }

    this.$addButton.prop("disabled", true);
    this.$addButton.text("Please wait ... ");

    let scrollTop = $(window).scrollTop();
    this.visTL.addProject(projectData).then((shed) => {
      this.visTL.visTL.setSelection(shed.id);
      this.lastProjectGroupSelectValue = this.$projectGroupSelect.val();
      this.hide();
      setTimeout(() => {
        $(window).scrollTop(scrollTop);
      }, 300);
    });
  }

  hide() {
    this.$el.modal("hide");
  }

  show() {
    this.$projectGroupSelect.empty();
    this.visTL.visTLData.currentVisData.visGroups.get().forEach((p) => {
      var $option;
      var text = `${p.sheetName}`;
      if (p["task"]) {
        return;
      } else if (p["isProject"]) {
        return;
      } else if (p["isProjectGroup"]) {
        text += `/ ${p["name"]}`;
      }
      $option = $("<option>", {
        value: p.id,
        text: text,
      });
      this.$projectGroupSelect.append($option);
    });

    this.$projectGroupSelect
      .val(this.lastProjectGroupSelectValue)
      .trigger("change");
    this.$addButton.text("Add");
    this.$addButton.prop("disabled", false);
    this.$el.modal("show");
  }
}

class UIEditProjectModal {
  constructor(visTL) {
    this.visTL = visTL;
    this.$el = $("#modal-edit-project");

    this.project = null;

    this.$form = $("#form-edit-project");
    this.$nameInput = this.$el.find("#form-edit-project-name");
    this.$projectGroupSelect = this.$el.find("#form-edit-project-projectgroup");
    this.$assigneeInput = this.$el.find("#form-edit-project-assignee");
    this.$colorInput = this.$el.find("#form-edit-project-color");
    this.$archiveInput = this.$el.find("#form-edit-project-archive");

    this.$updateButton = this.$el.find("#form-edit-project-button-update");

    this.$projectGroupSelect.select2({width: "100%"});

    this.$updateButton.on("click", () => {
      this.update();
    });
  }

  update() {
    let parentId = this.$projectGroupSelect.val();
    let g = this.visTL.visTLData.projectGroups.get(parentId);
    this.project.group = g.id;
    this.project.sheetId = g.sheetId;
    this.project.sheetName = g.sheetName;
    this.project.sheetUrl = g.sheetUrl;
    this.project.projectGroup = g.name;
    this.project.name = this.$nameInput.val().trim();
    this.project.assignee = this.$assigneeInput.val().trim();
    this.project.color = this.$colorInput.val().trim();
    this.project.archive = this.$archiveInput.prop("checked");

    if (this.project.name == null || this.project.name === "") {
      alert("Name を入力してください。");
      return;
    }

    let scrollTop = $(window).scrollTop();
    this.visTL.updateProject(this.project).then((p) => {
      this.project = null;
      this.visTL.visTL.setSelection(p.id);
      this.hide();
      setTimeout(() => {
        $(window).scrollTop(scrollTop);
      }, 300);
    });

    this.$updateButton.prop("disabled", true);
    this.$updateButton.text("Please wait ... ");
  }

  hide() {
    this.$el.modal("hide");
  }

  show(project) {
    this.project = project;
    this.$projectGroupSelect.empty();
    this.visTL.visTLData.currentVisData.visGroups.get().forEach((p) => {
      // sheet またぎのプロジェクトの変更はできないので 選択肢に列挙しない
      if (this.project.sheetId !== p.sheetId) {
        return;
      }
      var $option;
      if (p["isProject"]) {
        return;
      }
      if (p["isProjectGroup"]) {
        $option = $("<option>", {
          value: p.id,
          text: `${p.sheetName} / ${p.name}`,
        });
      }
      this.$projectGroupSelect.append($option);
    });

    this.$nameInput.val(project.name);

    let gId = project.projectGroup
      ? this.visTL.visTLData.converter.getProjectGroupId(
        project.sheetId,
        project.projectGroup
      )
      : null;
    this.$projectGroupSelect.val(gId);
    this.$projectGroupSelect.trigger("change");

    this.$assigneeInput.val(project.assignee);
    this.$colorInput.val(project.color);
    this.$archiveInput.prop("checked", project.archive);

    this.$updateButton.text("Update");
    this.$updateButton.prop("disabled", false);
    this.$el.modal("show");
  }
}

class UISort {
  constructor(visTL) {
    this.visTL = visTL;
    this.$el = $("#modal-sort");

    this.$spreadSheetSelect = $("#form-sort-spreadsheet");
    this.$spreadSheetSelect.select2({width: "100%"});

    this.$sheetSelect = $("#form-sort-sheet");
    this.$sheetSelect.select2({width: "100%"});

    this.$sortButton = $("#form-sort-sort");
    this.$sortButton.on("click", () => {
      this.sort();
    });
  }

  sort() {
    let sheetId = this.$spreadSheetSelect.val();
    let sheetName = this.$sheetSelect.val();

    this.$sortButton.prop("disabled", true);
    this.$sortButton.text("Please wait ... ");

    this.visTL.sort(sheetId, sheetName).then(() => {
      this.visTL.reload();
      this.hide();
    });
  }

  hide() {
    this.$el.modal("hide");
  }

  show() {
    this.$spreadSheetSelect.empty();
    this.visTL.sheetList.forEach((s) => {
      var $option = $("<option>", {
        value: s.id,
        text: s.name,
      });
      this.$spreadSheetSelect.append($option);
    });

    this.$sheetSelect.empty();
    this.$sheetSelect.append(
      $("<option>", {value: "Schedules", text: "Schedules"})
    );
    this.$sheetSelect.append(
      $("<option>", {value: "Projects", text: "Projects"})
    );

    this.$sortButton.text("Sort");
    this.$sortButton.prop("disabled", false);

    this.$el.modal("show");
  }
}

class UIFilter {
  constructor(visTL) {
    this.visTL = visTL;
    this.$el = $("#modal-filter");
    this.$projectGroupName = $("#form-filter-project-group-name");
    this.$projectName = $("#form-filter-project-name");
    this.$projectAssignee = $("#form-filter-project-assignee");
    this.$scheduleName = $("#form-filter-schedule-name");
    this.$scheduleAssignee = $("#form-filter-schedule-assignee");
    this.$showArchived = $("#form-filter-showarchived");

    this.$clearButton = $("#form-filter-clear");
    this.$clearButton.on("click", () => {
      this.clear();
    });

    this.$applyButton = $("#form-filter-apply");
    this.$applyButton.on("click", () => {
      this.apply();
    });
  }

  clear() {
    this.$projectGroupName.val(null);
    this.$projectName.val(null);
    this.$projectAssignee.val(null);
    this.$scheduleName.val(null);
    this.$scheduleAssignee.val(null);
    this.$showArchived.prop("checked", false);

    let filterSettings = {
      showArchived: false,
      projectGroup: {name: null},
      project: {name: null, assignee: null},
      schedule: {name: null, assignee: null},
    };

    this.visTL.applyFilter(filterSettings);
    this.hide();
  }

  apply() {
    let filterSettings = {
      showArchived: this.$showArchived.prop("checked"),
      projectGroup: {
        name: this.$projectGroupName.val(),
      },
      project: {
        name: this.$projectName.val(),
        assignee: this.$projectAssignee.val(),
      },
      schedule: {
        name: this.$scheduleName.val(),
        assignee: this.$scheduleAssignee.val(),
      },
    };

    this.visTL.applyFilter(filterSettings);
    this.hide();
  }

  hide() {
    this.$el.modal("hide");
  }

  show() {
    this.$el.modal("show");
    this.$showArchived.prop("checked", this.visTL.filterSettings.showArchived);
    this.$projectGroupName.val(this.visTL.filterSettings.projectGroup.name);
    this.$projectName.val(this.visTL.filterSettings.project.name);
    this.$projectAssignee.val(this.visTL.filterSettings.project.assignee);
    this.$scheduleName.val(this.visTL.filterSettings.schedule.name);
    this.$scheduleAssignee.val(this.visTL.filterSettings.schedule.assignee);
  }
}

class UIGetSettingsAsURLModal {
  constructor(visTL) {
    this.visTL = visTL;
    this.$el = $("#modal-get-settings-as-url");
    this.$urlInput = $("#modal-get-settings-as-url-url");
    this.$urlWithRangeInput = $("#modal-get-settings-as-url-url-withrange");
  }

  hide() {
    this.$el.modal("hide");
  }

  show() {
    let url = this.visTL.getSettingsAsUrl();
    this.$urlInput.val(url.url);
    this.$urlWithRangeInput.val(url.withRange);
    this.$el.modal("show");
  }
}
