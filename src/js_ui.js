class UI {
  constructor(visTL) {
    this.visTL = visTL;

    this.uiAddScheduleModal = new UIAddScheduleModal(visTL);
  } init() {
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

    $('#mybtn-get-settings-as-url').on('click', (e)=>{
      let url = this.visTL.getHiddenSettingsAsUrl();
      let $targ = $(e.currentTarget);
      $targ.popover({'content': url})
      $targ.popover('show');
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
    this.$addButton = this.$el.find('#form-add-schedule-button-add');

    this.$projectSelect.select2({width: '100%'});

    this.$addButton.on('click', ()=>{
      let values = this.$form.serializeArray();
      let p = this.visTL.visTLData.getVisibleVisData().visGroups.get(this.$projectSelect.val());
      let scheduleData = {
        group: p.id,
        sheetId: p.sheetId,
        sheetName: p.sheetName,
        projectGroup: p.projectGroupName,
        project: p.name,
        type: this.$typeSelect.val(),
        name: this.$titleInput.val().trim(),
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
    let visData = this.visTL.visTLData.getVisibleVisData();
    visData.visGroups.get().forEach((p)=>{
      if(!p['isProject']) {
        return;
      }
      let $option = $('<option>', {
        value: p.id,
        text: `${p.sheetName} / ${p['projectGroupName'] || '<none>'} / ${p.name}`
      });
      this.$projectSelect.append($option);
      this.$addButton.text('Add');
      this.$addButton.prop('disabled', false);
    });
    this.$el.modal('show');
  }
}
