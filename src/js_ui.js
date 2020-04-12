class UI {
  constructor(visTL) {
    this.visTL = visTL;

    this.uiAddScheduleModal = new UIAddScheduleModal(visTL);
  }

  init() {
    $('#mybtn-group-by-projectgroup').on('click', ()=>{
      this.visTL.groupByProjectGroup();
    });

    $('#mybtn-group-by-label').on('click', ()=>{
      this.visTL.groupByLabel();
    });

    $('#mybtn-restore-hidden').on('click', ()=>{
      this.visTL.restoreHidden();
    });

    $('#mybtn-add-schedule').on('click', ()=>{
      this.visTL.addSchedule();
      this.uiAddScheduleModal.show();
    });

    $('#mybtn-edit-schedule').on('click', ()=>{
      this.visTL.editSchedule();
    });

    $(document).on('click', '.mybtn-hide', (e)=>{
      let id = $(e.currentTarget).data('group');
      visTL.hideGroup(id);
    });
  }
}

class UIAddScheduleModal {
  constructor(visTL) {
    this.visTL = visTL;
    this.$el = $('#modal-add-schedule');

    this.$form = $('#form-add-schedule');
    this.$projectSelect = this.$el.find('#form-add-schedule-project');
    this.$titleInput = this.$el.find('#form-add-schedule-title');
    this.$addButton = this.$el.find('#form-add-schedule-button-add');

    this.$projectSelect.select2({width: '100%'});

    this.$addButton.on('click', ()=>{
      let values = this.$form.serializeArray();
      var scheduleData = {};
      values.forEach((v)=>{
        if(v['name'] === 'project') {
          let p = this.visTL.visTLData.visGroups.get(v['value']);
          scheduleData.group = p.id;
          scheduleData.sheetId = p.sheetId;
          scheduleData.sheetName = p.sheetName;
          scheduleData.projectGroup = p.projectGroupName;
          scheduleData.project = p.name;
          scheduleData.type = 'range';
        }
        if(v['name'] === 'title') {
          scheduleData['name'] = v['value'];
        }
      });
      console.log('-------- scheduleData --------');
      console.dir(scheduleData);
      this.visTL.addSchedule(scheduleData);
    });
  }

  show() {
    this.$el.modal('show');
    this.visTL.visTLData.visGroups.get().forEach((p)=>{
      if(!p['isProject']) {
        return;
      }
      let $option = $('<option>', {
        value: p.id,
        text: `${p.sheetName} / ${p['projectGroupName'] || '<none>'} / ${p.name}`
      });
      this.$projectSelect.append($option);
    });
  }
}
