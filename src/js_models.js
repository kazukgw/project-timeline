class VisTL {
  constructor(rpcClient, visTLData) {
    this.rpcClient = rpcClient;
    this.visTLData = visTLData;
    this.visTL = null;
  }

  create(container) {
    this.visTL = new vis.Timeline(
      container,
      this.visTLData.visItems,
      this.visTLData.visGroups,
      this.getVisTLOption()
    );

    console.log('add custom timemarkers');
    this.visTLData.timeMarkers.forEach((t)=>{
      console.dir(t);
      this.visTL.addCustomTime(t.date, t.id);
      // this.visTL.setCustomTimeMarker(t.name, t.id, false);
    });
  }

  filterGroup() {
    console.log('filter group');
    let filtered = this.visTLData.visGroups.get({
      filter: (g) => {
        if(g['isLevel0Group']) {
          return false;
        }
        return g.label !== 'Label 1';
      }
    });
    filtered.forEach((g)=>{
      this.visTLData.visGroups.update({id: g.id, visible: false});
    });
  }

  restoreHidden() {
    this.visTLData.visGroups.forEach((g)=>{
      let grp = this.visTLData.visGroups.get(g.id);
      if(grp && !grp.hidden) {
        this.visTLData.visGroups.update({id: g.id, visible: true});
      }
    });
    this.visTLData.visGroupsByLabel.forEach((g)=>{
      let grp = this.visTLData.visGroupsByLabel.get(g.id);
      if(grp && !grp.hidden) {
        this.visTLData.visGroupsByLabel.update({id: g.id, visible: true});
      }
    });
  }

  hideGroup(id) {
    this.visTLData.visGroups.update({id: id, visible: false});
    this.visTLData.visGroupsByLabel.update({id: id, visible: false});
  }

  groupByProjectGroup() {
    console.log('group by project group');
    this.visTL.setGroups(this.visTLData.visGroups);
    this.visTL.setItems(this.visTLData.visItems);
    this.visTL.redraw();
  }

  groupByLabel() {
    console.log('group by label');
    this.visTL.setGroups(this.visTLData.visGroupsByLabel);
    this.visTL.setItems(this.visTLData.visItems);
    this.visTL.redraw();
  }

  addSchedule(schedule) {
    console.log(`VisTL addSchedule: ${JSON.stringify(schedule)}`);
    this.rpcClient.addSchedule(schedule).then((scheduleHasId)=>{
        this.visTLData.visItems.add([scheduleHasId]);
      });
  }

  editSchedule() {
    console.log('edit schedule');
  }

  getVisTLOption() {
    // https://visjs.github.io/vis-timeline/docs/timeline/#Configuration_Options
    return {
      orientation: "top",
      preferZoom: false,
      verticalScroll: true,
      groupOrder: "index",
      start: moment().subtract(3, "months"),
      horizontalScroll: true,
      zoomMax: 100000000000,
      zoomMin: 1000000000,
      tooltip: { template: this.getTooltipTemplateFunc() },
      tooltipOnItemUpdateTime: true,
      template: this.getItemTemplateFunc(),
      groupTemplate: this.getGroupTemplateFunc(),
      snap: function(date, scale, step) {
        date.setHours(0); date.setMinutes(0); date.setSeconds(0);
        return date;
      },
      editable: {
        add: false,
        updateTime: true,
        updateGroup: false,
        remove: false,
        overrideItems: false
      },
      onMove: this.getOnMoveHandler().bind(this)
    };
  }

  getItemTemplateFunc() {
    let defaulTemplate = Handlebars.compile(`
        {{#if link}}
        <a href="{{link}}" target="_blank">{{name}}</a>
        {{else}}
        <p>{{name}}</p>
        {{/if}}
    `)
    return function(schedule, element, data) {
      let d = {
        link: schedule.link,
        name: schedule.name,
        color: schedule.color,
      };
      if(schedule.type === 'range') {
        // $(element).closest('.vis-item') では取得できなかった ...
        let $targ = $(element).parent().parent();
        $targ.css('border-color', d.color);
      }
      if(schedule.type === 'point') {
        let $targ = $(element).next('div');
        // console.dir($targ);
        $targ.css('border-color', d.color);
      }
      return defaulTemplate(d);
    }
  }

  getGroupTemplateFunc() {
    let defaulTemplate = Handlebars.compile(`
      <div>
        <p style="font-weight: 600">
          {{name}}
          {{#if sheetName}}
            <a class="badge badge-light" href="{{sheetUrl}}" target="_blank">{{sheetName}}<a>
          {{/if}}
          <button data-group="{{id}}" class="mybtn mybtn-hide"><i class="fa fa-eye-slash"></i></button>
        </p>
      </div>
    `);
    let nestedGroupTemplate = Handlebars.compile(`
      <div style="color: {{color}}">
        <p style="font-weight: 500">
          {{name}}
          {{#if label}}
          <span class="badge badge-secondary">{{label}}</span>
          {{/if}}
          <button data-group="{{id}}" class="mybtn mybtn-hide"><i class="fa fa-eye-slash"></i></button>
        </p>
      </div>
    `);
    return function(group, element, data) {
      let d = {
        id: group.id,
        name: group.name,
        color: group.color,
        label: group['label'],
        sheetName: group.sheetName,
        sheetUrl: group.sheetUrl,
      };
      if(group['isLevel0Group']) {
        $(element).closest('.vis-label').css('background-color', group.color);
        return defaulTemplate(d);
      }
      return nestedGroupTemplate(d);
    }
  }

  getTooltipTemplateFunc() {
    return function (item, element, data) {
      switch(item.type) {
        case "point":
          return `<p>開始: ${moment(item.start).format("YYYY/MM/DD")} </p>`;
        case "range":
          return `<p> 開始: ${moment(item.start).format("YYYY/MM/DD")} </p>
                    <p> 終了: ${moment(item.end).format("YYYY/MM/DD")} </p>`;
      }
    }
  }

  getOnMoveHandler() {
    // timeline の オブジェクト移動イベントのハンドラ
    // サーバ側にデータの変更をリクエストする
    // https://visjs.github.io/vis-timeline/docs/timeline/#Editing_Items
    let rpcClient = this.rpcClient;
    return function (item, callback) {
      rpcClient.updateSchedule(item)
        .then(()=>{
          console.log("updated sucessfully");
          callback(item);
        }, ()=>{
          console.log("failed to update");
          // callback に null を渡すと 変更がキャンセルされる
          // https://visjs.github.io/vis-timeline/docs/timeline/#Editing_Items
          callback(null);
        });
    }
  }
}

class VisTLData {
  constructor(rpcClient) {
    this.rpcClient = rpcClient;
    this.rawData = {};
    this.sheets = {};

    this.timeMarkers = new vis.DataSet();
    this.visItems = new vis.DataSet();
    this.visGroups = new vis.DataSet();
    this.visGroupsByLabel = new vis.DataSet();
  }

  setVisibleTrueAllVisGroup() {
    let visGroups = this.visGroups;
    this.visGroups.forEach((g)=>{
      visGroups.update({id: g.id, visible: true});
    });
  }

  setVisibleFalseVisGroup(group) {
    let visGroups = this.visGroups;
    let nested = this.projectGroupRelation[group];
    visGroups.update({ id: group, visible: false });
    console.log(`nested: ${nested}`);
    if(nested) {
      // ちょっとまってからでないと nested が消えない
      setTimeout(()=>{
        nested.forEach((v)=>{
          console.log(`hide nested: ${v}`)
          visGroups.update({ id: v, visible: false });
        });
      }, 100);
    }
  }

  initializeData(sheetList) {
    let sheetIdList = [];
    sheetList.forEach((s)=>{
      sheetIdList.push(s.id);
      this.sheets[s.id] = s;
    });
    return this.rpcClient.getAllData(sheetIdList)
      .then((dataList)=>{
        dataList.forEach((d)=>{
          if(d) {
            this.rawData[d.sheetId] = d.data;
          }
        });
        this.initializeTimeMarkers();
        this.initializeLabels();
        this.initializeProjectGroups();
        this.initializeProject();
        this.initializeSchedules();
        console.log(`initializeData: item count: ${this.visItems.length}`);
        console.log(`initializeData: group count: ${this.visGroups.length}`);
        return this;
      });
  }

  initializeTimeMarkers() {
    Object.entries(this.rawData).forEach(([sheetId, data])=>{
      data['timeMarkers'].forEach((t, i) =>{
        if(!t['name'] || t['hidden']) {
          return;
        }
        this.timeMarkers.add({
          id: this.getResourceId(sheetId, 'timeMarker', t.name),
          name: t.name,
          sheetId: sheetId,
          sheetName: this.sheets[sheetId].name,
          index: i,
          date: moment.tz(t.date.replace("Z", ""), moment.HTML5_FMT.DATETIME_LOCAL_MS, "UTC"),
        });
      });
    });
  }

  initializeLabels() {
    Object.entries(this.rawData).forEach(([sheetId, data])=>{
      data['labels'].forEach((l, i) =>{
        if(!l['name']) {
          return;
        }
        let color = !!l['color'] ? l.color : 'white';
        this.visGroupsByLabel.add({
          id: this.getResourceId(sheetId, 'label', l.name),
          name: l.name,
          sheetId: sheetId,
          sheetName: this.sheets[sheetId].name,
          index: i,
          color: color,
          isLevel0Group: true,
          isLabel: true,
          nestedGroups: [],
          showNested: true,
        });
      });
    });
  }

  initializeProjectGroups() {
    if(this.visGroupsByLabel.length == 0) {
      new Error('projectGroups must initialize after label');
    }
    Object.entries(this.rawData).forEach(([sheetId, data])=>{
      data['projectGroups'].forEach((g, i) =>{
        if(!g['name']) {
          return;
        }
        let color = !!g['color'] ? g.color : 'white';
        console.log(`initializeProjectGroups: group: ${this.getResourceId(sheetId, 'projectGroup', g.name)} ${JSON.stringify(g)}`);
        let grp = {
          id: this.getResourceId(sheetId, 'projectGroup', g.name),
          name: g.name,
          sheetId: sheetId,
          sheetName: this.sheets[sheetId].name,
          sheetUrl: this.sheets[sheetId].url,
          index: i,
          color: color,
          label: g.label,
          isLevel0Group: true,
          isProjectGroup: true,
          nestedGroups: [],
          showNested: true,
          hidden: g.hidden,
          visible: !g.hidden
        };

        this.visGroups.add(grp);

        let l = this.visGroupsByLabel.get(this.getResourceId(sheetId, 'label', g.label));
        console.log(`initializeProjectGroups: label: ${this.getResourceId(sheetId, 'label', g.label)} ${JSON.stringify(l)}`);
        if(l) {
          grp.nestedGroups = null;
          this.visGroupsByLabel.add(grp);
          l.nestedGroups.push(grp.id);
        }
      });
    });
  }

  initializeProject() {
    if(this.visGroups.length == 0) {
      new Error('project must initialize after projectGroups');
    }
    Object.entries(this.rawData).forEach(([sheetId, data])=>{
      data['projects'].forEach((p, i) =>{
        let g = this.visGroups.get(this.getResourceId(sheetId, 'projectGroup', p.projectGroup));
        let prj = {
          id: this.getResourceId(sheetId, 'project', p.name),
          name: p.name,
          sheetId: sheetId,
          sheetName: this.sheets[sheetId].name,
          sheetUrl: this.sheets[sheetId].url,
          label: p.label,
          index: i,
          color: !!p['color'] ? p.color : g ? g.color : 'black',
          showNested: true,
          isProject: true,
          orgHidden: p.hidden,
        };

        if(g) {
          prj.projectGroupName = g.name;
          prj.projectGroup = g.id;
          prj.hidden = prj.orgHidden || g.hidden;
          prj.visible = !prj.hidden;
          g.nestedGroups.push(prj.id)
        }

        let l = this.visGroupsByLabel.get(this.getResourceId(sheetId, 'label', p.label));
        console.log(`initializeProject: label: ${this.getResourceId(sheetId, 'label', p.label)} ${JSON.stringify(l)}`);
        if(l) {
          l.nestedGroups.push(prj.id);
        }

        this.visGroups.add(prj);
        this.visGroupsByLabel.add(prj);
      });
    });
  }

  initializeSchedules() {
    if(this.visGroups.length == 0) {
      new Error('schedules must initialize after projects and projectGroups');
    }
    Object.entries(this.rawData).forEach(([sheetId, data])=>{
      data['schedules'].forEach((s, i) =>{
        if(!s['id'] || !s['start']) {
          return;
        }

        let g = this.visGroups.get(this.getResourceId(sheetId, 'projectGroup', s.projectGroup));
        let p = this.visGroups.get(this.getResourceId(sheetId, 'project', s.project));
        let parentObj = p || g;
        let color = !!s['color'] ? s.color: parentObj ? parentObj.color : 'black';
        let sched = {
          id: this.getResourceId(sheetId, 'schedule', s.id),
          orgId: s.id,
          name: s.name,
          sheetId: sheetId,
          sheetName: this.sheets[sheetId].name,
          sheetUrl: this.sheets[sheetId].url,
          project: s.project,
          projectGroup: s.projectGroup,
          group: parentObj ? parentObj.id : null,
          index: i,
          link: s.link,
          color: color,
          type: !!s.type ? s.type : 'range',
          start: moment.tz(s.start.replace("Z", ""), moment.HTML5_FMT.DATETIME_LOCAL_MS, "UTC"),
          end: (!!s['end'])
            ? moment.tz(s.end.replace("Z", ""), moment.HTML5_FMT.DATETIME_LOCAL_MS, "UTC")
            : null,
        };
        this.visItems.add(sched);
      });
    });
  }

  getResourceId(sheetId, type, resourceId) {
    return `${sheetId}##${type}##${resourceId}`;
  }
}

class RPCClient {
  constructor(gs) {
    this.gs = gs;
  }

  getAllData(sheetIdList) {
    let gs = this.gs;
    let promises = sheetIdList.map((sheetId)=>{
      return new Promise((resolve, reject)=>{
        gs.run
          .withSuccessHandler((dataFromGAS) => {
            let d = {
              sheetId: sheetId,
              data: JSON.parse(dataFromGAS)
            };
            console.log(`getAllData: ${sheetId}: data: ${dataFromGAS}`);
            resolve(d);
          })
          .withFailureHandler((error) => {
            alert("データ取得に失敗しました: " + error);
            resolve(null);
          })
          .rpc('getAllData', JSON.stringify({sheetId: sheetId}));
      });
    });
    return Promise.all(promises);
  }

  updateSchedule(schedule) {
    let gs = this.gs;
    return new Promise((resolve, reject) => {
      var scheduleJson = JSON.stringify({
        sheetId: schedule.sheetId,
        id: schedule.orgId,
        type: schedule.type,
        content: schedule.content,
        start: schedule.start,
        end: schedule.end
      });
      gs.run
        .withSuccessHandler(() => {
          console.log("updated sucessfully");
          resolve();
        })
        .withFailureHandler((error) => {
          console.log(`failed to update: error: ${error}`);
          // callback に null を渡すと 変更がキャンセルされる
          // https://visjs.github.io/vis-timeline/docs/timeline/#Editing_Items
          reject();
        })
        .rpc('updateSchedule', scheduleJson);
    });
  }

  addSchedule(schedule) {
    let gs = this.gs;
    return new Promise((resolve, reject) => {
      var scheduleJson = JSON.stringify({
        sheetId: schedule.sheetId,
        type: schedule.type,
        name: schedule.name,
        project: schedule.project,
        projectGroup: schedule.projectGroup
      });
      gs.run
        .withSuccessHandler(() => {
          console.log("create sucessfully");
          resolve();
        })
        .withFailureHandler((error) => {
          console.log(`failed to create: error: ${error}`);
          reject();
        })
        .rpc('addSchedule', scheduleJson);
    });
  }
}
