class UI {
  constructor(visTL) {
    this.visTL = visTL;

    this.uiAddScheduleModal = new UIAddScheduleModal(visTL);
    this.uiEditScheduleModal = new UIEditScheduleModal(visTL);
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
    this.$typeSelect = this.$el.find("#form-add-schedule-type");
    this.$titleInput = this.$el.find("#form-add-schedule-title");
    this.$descriptionInput = this.$el.find("#form-add-schedule-description");
    this.$assigneeInput = this.$el.find("#form-add-schedule-assignee");
    this.$linkInput = this.$el.find("#form-add-schedule-link");
    this.$startInput = this.$el.find("#form-add-schedule-start");
    this.$endInput = this.$el.find("#form-add-schedule-end");

    this.$addButton = this.$el.find("#form-add-schedule-button-add");

    this.$projectSelect.select2({ width: "100%" });

    this.$addButton.on("click", () => {
      this.onClick();
    });
  }

  onClick() {
    let parentId = this.$projectSelect.val();
    let g = this.visTL.visTLData.projectGroups.get(parentId);
    let p = this.visTL.visTLData.projects.get(parentId);
    let parentObj = p || g;
    let start = this.$startInput.val();
    let end = this.$endInput.val();
    let scheduleData = {
      group: parentObj.id,
      sheetId: parentObj.sheetId,
      sheetName: parentObj.sheetName,
      sheetUrl: parentObj.sheetName,
      projectGroup: parentObj["isProjectGroup"]
        ? parentObj.name
        : p.projectGroup,
      project: parentObj["isProjectGroup"] ? "" : parentObj.name,
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

    this.visTL.addSchedule(scheduleData).then((shed) => {
      this.visTL.visTL.setSelection(shed.id);
      this.hide();
    });
  }

  hide() {
    this.$el.modal("hide");
  }

  show() {
    this.$projectSelect.empty();
    this.visTL.visTLData.currentVisData.visGroups.get().forEach(p => {
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
    this.$typeSelect = this.$el.find("#form-edit-schedule-type");
    this.$titleInput = this.$el.find("#form-edit-schedule-title");
    this.$descriptionInput = this.$el.find("#form-edit-schedule-description");
    this.$assigneeInput = this.$el.find("#form-edit-schedule-assignee");
    this.$progressInput = this.$el.find("#form-edit-schedule-progress");
    this.$linkInput = this.$el.find("#form-edit-schedule-link");
    this.$updateButton = this.$el.find("#form-edit-schedule-button-update");

    this.$projectSelect.select2({ width: "100%" });

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
    this.schedule.type = this.$typeSelect.val();
    this.schedule.name = this.$titleInput.val().trim();
    this.schedule.description = this.$descriptionInput.val().trim();
    this.schedule.assignee = this.$assigneeInput.val().trim();
    this.schedule.progress = this.$progressInput.val().trim();
    this.schedule.link = this.$linkInput.val().trim();
    this.visTL.updateSchedule(this.schedule).then((shed) => {
      this.schedule = null;
      this.visTL.visTL.setSelection(shed.id);
      this.hide();
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
      projectGroup: { name: null },
      project: { name: null, assignee: null },
      schedule: { name: null, assignee: null }
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
