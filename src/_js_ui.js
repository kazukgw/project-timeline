class UI {
  constructor(visTL) {
    this.visTL = visTL;

    this.uiAddScheduleModal = new UIAddScheduleModal(visTL);
    this.uiEditScheduleModal = new UIEditScheduleModal(visTL);
    this.uiAddProjectModal = new UIAddProjectModal(visTL);
    this.uiEditProjectModal = new UIEditProjectModal(visTL);
    this.uiFilter = new UIFilter(visTL);
    this.uiGetSettingsAsUrl = new UIGetSettingsAsURLModal(visTL);
  }

  init() {
    $("#mybtn-reload").on("click", e => {
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

    $("#mybtn-toggle-foldings").on("click", () => {
      this.visTL.toggleFoldings();
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

    $("#mybtn-filter").on("click", e => {
      this.uiFilter.show();
    });

    $("#mybtn-get-settings-as-url").on("click", e => {
      this.uiGetSettingsAsUrl.show();
    });

    $(document).on("click", ".mybtn-hide", e => {
      let id = $(e.currentTarget).data("group");
      this.visTL.hideGroup(id);
    });
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
    this.$startInput = this.$el.find("#form-add-schedule-start");
    this.$endInput = this.$el.find("#form-add-schedule-end");

    this.$addButton = this.$el.find("#form-add-schedule-button-add");

    this.$projectSelect.select2({width: "100%"});

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
    if (parentObj['isProject']) {
      projectGroup = parentObj['projectGroup'];
      project = parentObj['name'];
    } else if (parentObj['isProjectGroup']) {
      projectGroup = parentObj['name'];
      project = null;
    }

    let start = this.$startInput.val();
    let end = this.$endInput.val();
    let scheduleData = {
      group: parentObj.id,
      sheetId: parentObj.sheetId,
      sheetName: parentObj.sheetName,
      sheetUrl: parentObj.sheetName,
      projectGroup: projectGroup,
      project: project,
      task: this.$taskInput.prop('checked'),
      type: this.$typeSelect.val(),
      name: this.$titleInput.val().trim(),
      description: this.$descriptionInput.val().trim(),
      link: this.$linkInput.val().trim(),
      assignee: this.$assigneeInput.val().trim(),
      start: start ? moment(start) : moment(),
      end: end ? moment(end) : moment().add(1, "month")
    };

    this.$addButton.prop("disabled", true);
    this.$addButton.text("Please wait ... ");

    let scrollTop = $(window).scrollTop();
    this.visTL.addSchedule(scheduleData).then(shed => {
      this.visTL.visTL.setSelection(shed.id);
      this.hide();
      setTimeout(() => {$(window).scrollTop(scrollTop);}, 300);
    });
  }

  hide() {
    this.$el.modal("hide");
  }

  show() {
    this.$projectSelect.empty();
    this.visTL.visTLData.currentVisData.visGroups.get().forEach(p => {
      var $option;
      var text = `${p.sheetName}`;
      if (p['task']) {
        return;
      } else if (p['isProject']) {
        text += `/ ${p['projectGroup']} / ${p['name']}`;
      } else if (p['isProjectGroup']) {
        text += `/ ${p['name']}`;
      }
      $option = $("<option>", {
        value: p.id,
        text: text
      });
      this.$projectSelect.append($option);
    });
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
    this.schedule.group = parentObj.id;
    this.schedule.sheetId = parentObj.sheetId;
    this.schedule.sheetName = parentObj.sheetName;
    this.schedule.sheetUrl = parentObj.sheetUrl;
    this.schedule.projectGroup = parentObj["isProjectGroup"]
      ? parentObj.name
      : parentObj.projectGroupName;
    this.schedule.project = parentObj["isProjectGroup"] ? "" : parentObj.name;
    this.schedule.task = this.$taskInput.prop('checked');
    this.schedule.type = this.$typeSelect.val();
    this.schedule.name = this.$titleInput.val().trim();
    this.schedule.description = this.$descriptionInput.val().trim();
    this.schedule.assignee = this.$assigneeInput.val().trim();
    this.schedule.progress = this.$progressInput.val().trim();
    this.schedule.link = this.$linkInput.val().trim();

    let scrollTop = $(window).scrollTop();
    this.visTL.updateSchedule(this.schedule).then(shed => {
      this.schedule = null;
      this.visTL.visTL.setSelection(shed.id);
      this.hide();
      setTimeout(() => {$(window).scrollTop(scrollTop);}, 300);
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
    this.visTL.visTLData.currentVisData.visGroups.get().forEach(p => {
      // sheet またぎのプロジェクトの変更はできないので 選択肢に列挙しない
      if (this.schedule.sheetId !== p.sheetId) {
        return;
      }
      var $option;
      if (p["isProject"]) {
        $option = $("<option>", {
          value: p.id,
          text: `${p.sheetName} / ${p["projectGroup"] || "<none>"} / ${p.name}`
        });
      }
      if (p["isProjectGroup"]) {
        $option = $("<option>", {
          value: p.id,
          text: `${p.sheetName} / ${p.name}`
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

    this.$taskInput.prop('checked', schedule.task);
    this.$typeSelect.val(schedule.type);
    this.$titleInput.val(schedule.name);
    this.$descriptionInput.val(schedule.description);
    this.$assigneeInput.val(schedule.assignee);
    this.$progressInput.val(schedule.progress);
    this.$linkInput.val(schedule.link);

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

    this.$addButton.prop("disabled", true);
    this.$addButton.text("Please wait ... ");

    let scrollTop = $(window).scrollTop();
    this.visTL.addProject(projectData).then(shed => {
      this.visTL.visTL.setSelection(shed.id);
      this.hide();
      setTimeout(() => {$(window).scrollTop(scrollTop);}, 300);
    });
  }

  hide() {
    this.$el.modal("hide");
  }

  show() {
    this.$projectGroupSelect.empty();
    this.visTL.visTLData.currentVisData.visGroups.get().forEach(p => {
      var $option;
      var text = `${p.sheetName}`;
      if (p['task']) {
        return;
      } else if (p['isProject']) {
        return;
      } else if (p['isProjectGroup']) {
        text += `/ ${p['name']}`;
      }
      $option = $("<option>", {
        value: p.id,
        text: text
      });
      this.$projectGroupSelect.append($option);
    });
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

    this.$updateButton = this.$el.find("#form-edit-project-button-update");

    this.$projectGroupSelect.select2({width: "100%"});

    this.$updateButton.on("click", () => {
      this.update();
    });
  }

  update() {
    let parentId = this.$projectSelect.val();
    let g = this.visTL.visTLData.projectGroups.get(parentId);
    this.project.group = g.id;
    this.project.sheetId = parentObj.sheetId;
    this.project.sheetName = parentObj.sheetName;
    this.project.sheetUrl = parentObj.sheetUrl;
    this.project.projectGroup = g.name;
    this.project.name = this.$nameInput.val().trim();
    this.project.assignee = this.$assigneeInput.val().trim();
    this.project.color = this.$colorInput.val().trim();

    let scrollTop = $(window).scrollTop();
    this.visTL.updateproject(this.project).then(p => {
      this.project = null;
      this.visTL.visTL.setSelection(p.id);
      this.hide();
      setTimeout(() => {$(window).scrollTop(scrollTop);}, 300);
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
    this.visTL.visTLData.currentVisData.visGroups.get().forEach(p => {
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
          text: `${p.sheetName} / ${p.name}`
        });
      }
      this.$projectSelect.append($option);
    });

    this.$nameInput.val(project.name);

    let gId = project.projectGroup
      ? this.visTL.visTLData.converter.getProjectGroupId(
        project.sheetId,
        project.projectGroup
      )
      : null;
    this.$projectGroupSelect.val(gId);
    this.$projectGroupGroupSelect.trigger("change");

    this.$assigneeInput.val(project.assignee);
    this.$colorInput.val(project.color);

    this.$updateButton.text("Update");
    this.$updateButton.prop("disabled", false);
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

    let filterSettings = {
      projectGroup: {name: null},
      project: {name: null, assignee: null},
      schedule: {name: null, assignee: null}
    };

    this.visTL.applyFilter(filterSettings);
    this.hide();
  }

  apply() {
    let scheduleName = this.$scheduleName.val();
    let scheduleAssignee = this.$scheduleAssignee.val();

    let filterSettings = {
      projectGroup: {
        name: this.$projectGroupName.val()
      },
      project: {
        name: this.$projectName.val(),
        assignee: this.$projectAssignee.val()
      },
      schedule: {
        name: this.$scheduleName.val(),
        assignee: this.$scheduleAssignee.val()
      }
    };

    this.visTL.applyFilter(filterSettings);
    this.hide();
  }

  hide() {
    this.$el.modal("hide");
  }

  show() {
    this.$el.modal("show");
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

  show(schedule) {
    let url = this.visTL.getSettingsAsUrl();
    this.$urlInput.val(url.url);
    this.$urlWithRangeInput.val(url.withRange);
    this.$el.modal("show");
  }
}
