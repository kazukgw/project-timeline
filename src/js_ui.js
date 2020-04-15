class UI {
  constructor(visTL) {
    this.visTL = visTL;

    this.uiAddScheduleModal = new UIAddScheduleModal(visTL);
    this.uiEditScheduleModal = new UIEditScheduleModal(visTL);
    this.uiGetSettingsAsUrl = new UIGetSettingsAsURLModal(visTL);
  }

  init() {
    $('#mybtn-toggle-foldings').on('click', ()=>{
      this.visTL.toggleFoldings();
    });

    $('#mybtn-group-by-projectgroup').on('click', ()=>{
      this.visTL.resetData();
    });

    $('#mybtn-group-by-label').on('click', ()=>{
      this.visTL.resetDataWithLabel();
    });

    $('#mybtn-restore-hidden').on('click', ()=>{
      this.visTL.restoreHidden();
    });

    $('#mybtn-add-schedule').on('click', ()=>{
      this.uiAddScheduleModal.show();
    });

    $('#mybtn-edit-schedule').on('click', ()=>{
      let schedule = this.visTL.getSelectedSchedule();
      if(!schedule) {
        return;
      }
      this.uiEditScheduleModal.show(schedule);
    });

    $('#mybtn-get-settings-as-url').on('click', (e)=>{
      this.uiGetSettingsAsUrl.show();
    });

    $(document).on('click', '.mybtn-hide', (e)=>{
      let id = $(e.currentTarget).data('group');
      this.visTL.hideGroup(id);
    });
  }
}

class UIAddScheduleModal {
  constructor(visTL) {
    this.visTL = visTL;
    this.$el = $('#modal-add-schedule');

    this.$form = $('#form-add-schedule');
    this.$projectSelect = this.$el.find('#form-add-schedule-project');
    this.$typeSelect = this.$el.find('#form-add-schedule-type');
    this.$titleInput = this.$el.find('#form-add-schedule-title');
    this.$assigneeInput = this.$el.find('#form-add-schedule-assignee');
    this.$linkInput = this.$el.find('#form-add-schedule-link');
    this.$addButton = this.$el.find('#form-add-schedule-button-add');

    this.$projectSelect.select2({width: '100%'});

    this.$addButton.on('click', ()=>{
      let values = this.$form.serializeArray();
      let p = this.visTL.visTLData.getVisibleVisData().visGroups.get(this.$projectSelect.val());
      let scheduleData = {
        group: p.id,
        sheetId: p.sheetId,
        sheetName: p.sheetName,
        projectGroup: p['isProjectGroup'] ? p.name : p.projectGroupName,
        project: p['isProjectGroup'] ? '' : p.name,
        type: this.$typeSelect.val(),
        name: this.$titleInput.val().trim(),
        assignee: this.$assigneeInput.val().trim(),
        link: this.$linkInput.val().trim(),
      };
      this.$addButton.prop('disabled', true);
      this.$addButton.text('Please wait ... ');

      this.visTL.addSchedule(scheduleData).then(()=>{
        this.hide();
      });
    });
  }

  hide() {
    this.$el.modal('hide')
  }

  show() {
    this.$projectSelect.empty();
    let visData = this.visTL.visTLData.getVisibleVisData();
    visData.visGroups.get().forEach((p)=>{
      var $option;
      if(p['isProject']) {
        $option = $('<option>', {
          value: p.id,
          text: `${p.sheetName} / ${p['projectGroupName'] || '<none>'} / ${p.name}`
        });
      }
      if(p['isProjectGroup']) {
        $option = $('<option>', {
          value: p.id,
          text: `${p.sheetName} / ${p.name}`
        });
      }
      this.$projectSelect.append($option);
    });
    this.$addButton.text('Add');
    this.$addButton.prop('disabled', false);
    this.$el.modal('show');
  }
}

class UIEditScheduleModal {
  constructor(visTL) {
    this.visTL = visTL;
    this.$el = $('#modal-edit-schedule');

    this.schedule = null;

    this.$form = $('#form-edit-schedule');
    this.$idInput = this.$el.find('#form-edit-schedule-id');
    this.$projectSelect = this.$el.find('#form-edit-schedule-project');
    this.$typeSelect = this.$el.find('#form-edit-schedule-type');
    this.$titleInput = this.$el.find('#form-edit-schedule-title');
    this.$assigneeInput = this.$el.find('#form-edit-schedule-assignee');
    this.$linkInput = this.$el.find('#form-edit-schedule-link');
    this.$updateButton = this.$el.find('#form-edit-schedule-button-update');

    this.$projectSelect.select2({width: '100%'});

    this.$updateButton.on('click', ()=>{
      let values = this.$form.serializeArray();
      let visData = this.visTL.visTLData.getVisibleVisData();
      let p = visData.visGroups.get(this.$projectSelect.val());
      this.schedule.group = p.id,
      this.schedule.sheetId = p.sheetId,
      this.schedule.sheetName = p.sheetName,
      this.schedule.projectGroup = p['isProjectGroup'] ? p.name : p.projectGroupName,
      this.schedule.project = p['isProjectGroup'] ? '' : p.name,
      this.schedule.type = this.$typeSelect.val(),
      this.schedule.name = this.$titleInput.val().trim(),
      this.schedule.assignee = this.$assigneeInput.val().trim(),
      this.schedule.link = this.$linkInput.val().trim(),

      this.visTL.updateSchedule(this.schedule).then(()=>{
        this.schedule = null;
        this.hide();
      });

      this.$updateButton.prop('disabled', true);
      this.$updateButton.text('Please wait ... ');
    });
  }

  hide() {
    this.$el.modal('hide')
  }

  show(schedule) {
    this.schedule = schedule;
    this.$projectSelect.empty();
    let visData = this.visTL.visTLData.getVisibleVisData();
    visData.visGroups.get().forEach((p)=>{
      var $option;
      if(p['isProject']) {
        $option = $('<option>', {
          value: p.id,
          text: `${p.sheetName} / ${p['projectGroupName'] || '<none>'} / ${p.name}`
        });
      }
      if(p['isProjectGroup']) {
        $option = $('<option>', {
          value: p.id,
          text: `${p.sheetName} / ${p.name}`
        });
      }
      this.$projectSelect.append($option);
    });
    this.$idInput.val(schedule.orgId);
    this.$projectSelect.val(schedule.group);
    this.$projectSelect.trigger('change');
    this.$typeSelect.val(schedule.type);
    this.$titleInput.val(schedule.name);
    this.$assigneeInput.val(schedule.assignee);
    this.$linkInput.val(schedule.link);

    this.$updateButton.text('Update');
    this.$updateButton.prop('disabled', false);
    this.$el.modal('show');
  }
}

class UIGetSettingsAsURLModal {
  constructor(visTL) {
    this.visTL = visTL;
    this.$el = $('#modal-get-settings-as-url');
    this.$urlInput = $('#modal-get-settings-as-url-url');
  }

  hide() {
    this.$el.modal('hide')
  }

  show(schedule) {
    this.$urlInput.val(this.visTL.getHiddenSettingsAsUrl());
    this.$el.modal('show');
  }
}
