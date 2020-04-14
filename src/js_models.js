class VisTL {
  constructor(requestUrl, rpcClient, visTLData) {
    this.requestUrl = requestUrl;
    this.rpcClient = rpcClient;
    this.visTLData = visTLData;
    this.visTL = null;
    this.groupByState = 'group';
    this.hiddenGroups = [];

    let hidden = (new URL(this.requestUrl)).searchParams.get('hidden');
    if(hidden) {
      this.hiddenGroups = JSON.parse(pako.inflate(atob(hidden), { to: 'string' }));
      console.log('--------')
      console.dir(this.hiddenGroups);
    }
  }

  create(container) {
    let visData = this.visTLData.getVisibleVisData(this.hiddenGroups);
    this.visTL = new vis.Timeline(
      container,
      visData.visItems,
      visData.visGroups,
      this.getVisTLOption()
    );
  }

  getHiddenSettingsAsUrl() {
    if(this.hiddenGroups.length === 0) {
      return this.requestUrl;
    }
    let settings = btoa(pako.deflate(JSON.stringify(this.hiddenGroups), {to: 'string'}));
    let url = new URL(this.requestUrl);
    url.searchParams.set('hidden', settings);
    return url.href;
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

  resetData() {
    let visData = this.visTLData.getVisibleVisData(this.hiddenGroups);
    this.visTL.setData({
      groups: visData.visGroups,
      items: visData.visItems
    });
    this.groupByState = 'group';
  }

  resetDataWithLabel() {
    let visData = this.visTLData.getVisibleVisData(this.hiddenGroups);
    this.visTL.setData({
      groups: visData.visGroupsByLabel,
      items: visData.visItems
    });
    this.groupByState = 'label';
  }

  restoreHidden() {
    this.hiddenGroups = [];
    this.visTLData.setVisibleTrueAllVisGroup();
    if(this.groupByState === 'group') {
      this.resetData();
    } else {
      this.resetDataWithLabel();
    }
  }

  hideGroup(id) {
    this.visTLData.setVisibleFalseAllVisGroup(id);
    this.hiddenGroups.push(id);
    if(this.groupByState === 'group') {
      this.resetData();
    } else {
      this.resetDataWithLabel();
    }
  }

  addSchedule(schedule) {
    return this.rpcClient.addSchedule(schedule).then((scheduleHasId)=>{
      let s = scheduleHasId;
      let g = this.visTLData.projectGroups.get(this.visTLData.getResourceId(s.sheetId, 'projectGroup', s.projectGroup));
      let p = this.visTLData.projects.get(this.visTLData.getResourceId(s.sheetId, 'project', s.project));
      let parentObj = p || g;
      let color = !!s['color'] ? s.color: parentObj ? parentObj.color : 'black';
      let sched = {
        id: this.visTLData.getResourceId(s.sheetId, 'schedule', s.id),
        orgId: s.id,
        name: s.name,
        sheetId: s.sheetId,
        sheetName: this.visTLData.sheets[s.sheetId].name,
        sheetUrl: this.visTLData.sheets[s.sheetId].url,
        project: s.project,
        projectGroup: s.projectGroup,
        group: parentObj ? parentObj.id : null,
        index: this.visTLData.schedules.length + 1,
        link: null,
        color: color,
        type: s.type,
        start: s.start,
        end: s.end,
        editable: {
          add: false,
          updateTime: true,
          updateGroup: false,
          remove: false,
          overrideItems: false
        }
      };
      console.log(`visTL addSchedule: scheduleHasId: ${JSON.stringify(sched)}`);
      this.visTLData.schedules.add(sched);
      this.resetData();
    });
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
      tooltip: {
        overflowMethod: 'cap',
        delay: 100,
        template: this.getTooltipTemplateFunc()
      },
      tooltipOnItemUpdateTime: {
        template: this.getTooltipTemplateFunc()
      },
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
        <a href="{{link}}" target="_blank">
          {{#if assignee}} <span class="badge badge-secondary">{{assignee}}</span> {{/if}}
          {{name}}
        </a>
        {{else}}
        <p>
          {{#if assignee}} <span class="badge badge-secondary">{{assignee}}</span> {{/if}}
          {{name}}
        </p>
        {{/if}}
    `)
    return function(schedule, element, data) {
      let d = {
        link: schedule.link,
        name: schedule.name,
        color: schedule.color,
        assignee: schedule.assignee,
      };
      switch(schedule.type) {
      case 'range':
        // $(element).closest('.vis-item') では取得できなかった ...
        var $targ = $(element).parent().parent();
        $targ.css('border-color', d.color);
        return defaulTemplate(d);
      case 'point':
        var $targ = $(element).next('div');
        $targ.css('border-color', d.color);
        return defaulTemplate(d);
      case 'background':
        var $targ = $(element).parent();
        $targ.css('background-color', d.color);
        $targ.css('opacity', '0.1');
        return d.name;
      }
    }
  }

  getGroupTemplateFunc() {
    let defaulTemplate = Handlebars.compile(`
      <div>
        <p style="font-weight: 600">
          {{#if link}}
            <a href="{{link}}" target="_blank">{{name}}</a>
          {{else}}
            {{name}}
          {{/if}}

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
          {{#if link}}
            <a href="{{link}}" target="_blank">{{name}}</a>
          {{else}}
            {{name}}
          {{/if}}

          {{#if assignee}} <span class="badge badge-info">{{assignee}}</span> {{/if}}

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
        assignee: group['assignee'],
        label: group['label'],
        sheetName: group.sheetName,
        sheetUrl: group.sheetUrl,
        link: group.link,
      };
      if(group['isLevel0Group']) {
        $(element).closest('.vis-label').css('background-color', group.color);
        return defaulTemplate(d);
      }
      return nestedGroupTemplate(d);
    }
  }

  getTooltipTemplateFunc() {
    let pointTemplate = Handlebars.compile(`
      <p style="font-weight: 500"> {{name}} </p>
      <span> 開始: {{start}} </span>
    `);
    let rangeTemplate = Handlebars.compile(`
      <p style="font-weight: 500"> {{name}} </p>
      <span> 開始: {{start}} </span><br>
      <span> 終了: {{end}} </span><br>
      <span> 期間: {{duration}}日 </span>
    `);
    return function (item, element, data) {
      let d = {
        name: item.name,
        start: moment(item.start).format("YYYY/MM/DD"),
        end: moment(item.end).format("YYYY/MM/DD")
      };
      if(item.end) {
        d.duration = Math.floor(moment.duration(moment(item.end).diff(moment(item.start))).asDays());
      }
      switch(item.type) {
        case "point":
          return pointTemplate(d);
        case "range":
          return rangeTemplate(d);
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
    this.rpcClient = rpcClient; this.rawData = {}; this.sheets = {};

    this.schedules = new vis.DataSet();
    this.projects = new vis.DataSet();
    this.projectGroups = new vis.DataSet();
    this.labels = new vis.DataSet();
  }

  getVisibleVisData(hiddenGroupIds) {
    hiddenGroupIds = hiddenGroupIds || [];
    let projectGroupIds = {};
    let projectGroups = [];
    this.projectGroups.forEach((g)=>{
      if(g.invalid) return;
      if(!g.visible) return;
      if(hiddenGroupIds.indexOf(g.id) > -1) return;
      projectGroupIds[g.id] = true;
      projectGroups.push(g);
    });

    let projectIds = {};
    let projects = [];
    this.projects.forEach((p)=>{
      if(p.invalid) return;
      if(!p.visible) return;
      if(hiddenGroupIds.indexOf(p.id) > -1) return;
      if(
        (!p['projectGroup']) ||
        (p['projectGroup'] && projectGroupIds[p['projectGroup']])
      ) {
        projectIds[p.id] = true;
        projects.push(p);
      };
    });

    projectGroups.forEach((g)=>{
      if(g['nestedGroups']) {
        let newNestedGroups = [];
        g['nestedGroups'].forEach((ng)=>{
          if(projectIds[ng]) {
            newNestedGroups.push(ng);
          }
        });
        g['nestedGroups'] = newNestedGroups;
      }
    });
    let visGroups = new vis.DataSet(projectGroups.concat(projects));

    let labelIds = {};
    let labels = [];
    this.labels.forEach((l)=>{
      if(l.invalid) return;
      if(!l.visible) return;
      if(hiddenGroupIds.indexOf(l.id) > -1) return;
      labelIds[l.id] = true;
      labels.push(l);
    });
    labels.forEach((l)=>{
      if(l['nestedGroups']) {
        let newNestedGroups = [];
        l['nestedGroups'].forEach((ng)=>{
          if(projectGroupIds[ng] || projectIds[ng]) {
            newNestedGroups.push(ng);
          }
        });
        l['nestedGroups'] = newNestedGroups;
      }
    });
    // 多段ネストになるのを防ぐためにnestedGroups は null を設定してから add 初期化する
    projectGroups.forEach(g=>g.nestedGroups = null);
    let visGroupsByLabel = new vis.DataSet(labels.concat(projectGroups).concat(projects));

    let visItems = new vis.DataSet(this.schedules.get({
      filter: (s)=>{
        if(s.invalid) return false;
        if(!s['group']) return true;
        if(projectIds[s.group] || projectGroupIds[s.group]) {
          return true;
        }
        return false
      }
    }));
    return {
      visGroups: visGroups,
      visGroupsByLabel: visGroupsByLabel,
      visItems: visItems
    };
  }

  setVisibleTrueAllVisGroup() {
    let setVisibleTrue = function(groups) {
      groups.forEach((g)=>{ groups.update({id: g.id, visible: true}); });
    };
    setVisibleTrue(this.labels);
    setVisibleTrue(this.projectGroups);
    setVisibleTrue(this.projects);
  }

  setVisibleFalseAllVisGroup(id) {
    let setVisibleFalse = function(id, groups) {
      let g = groups.get(id);
      if(!g) {
        return;
      }
      groups.update({id: g.id, visible: false});
    }
    setVisibleFalse(id, this.labels);
    setVisibleFalse(id, this.projectGroups);
    setVisibleFalse(id, this.projects);
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
        this.initializeLabels();
        this.initializeProjectGroups();
        this.initializeProject();
        this.initializeSchedules();

        let projects = {};
        this.schedules.forEach((s)=>{
          if(s.invalid) {
            return;
          }
          projects[s.group] = true;
        });
        this.projects.forEach((p)=>{
          if(!projects[p.id]) {
            this.projects.update({id: p.id, invalid: true, visible: false});
          }
        });
        return this;
      });
  }

  initializeLabels() {
    Object.entries(this.rawData).forEach(([sheetId, data])=>{
      data['labels'].forEach((l, i) =>{
        if(!l['name']) {
          return;
        }
        let color = !!l['color'] ? l.color : 'white';
        this.labels.add({
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
    if(this.labels.length == 0) {
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
          link: g.link,
          isLevel0Group: true,
          isProjectGroup: true,
          nestedGroups: [],
          showNested: true,
          invalid: g.invalid,
          visible: !g.invalid
        };

        this.projectGroups.add(grp);

        let l = this.labels.get(this.getResourceId(sheetId, 'label', g.label));
        console.log(`initializeProjectGroups: label: ${this.getResourceId(sheetId, 'label', g.label)} ${JSON.stringify(l)}`);
        if(l) {
          l.nestedGroups.push(grp.id);
        }
      });
    });
  }

  initializeProject() {
    if(this.projectGroups.length == 0) {
      new Error('project must initialize after projectGroups');
    }
    Object.entries(this.rawData).forEach(([sheetId, data])=>{
      data['projects'].forEach((p, i) =>{
        if(!p['name']) {
          return;
        }
        let g = this.projectGroups.get(this.getResourceId(sheetId, 'projectGroup', p.projectGroup));
        var color = !!p['color'] ? p.color : g ? g.color : 'black';
        if(color === 'white') {
          color = 'black';
        }
        let prj = {
          id: this.getResourceId(sheetId, 'project', p.name),
          name: p.name,
          sheetId: sheetId,
          sheetName: this.sheets[sheetId].name,
          sheetUrl: this.sheets[sheetId].url,
          label: p.label,
          index: i,
          color: color,
          assignee: p.assignee,
          showNested: true,
          isProject: true,
          orgInvalid: p.invalid,
          invalid: p.invalid,
          link: p.link,
        };

        if(g) {
          prj.projectGroupName = g.name;
          prj.projectGroup = g.id;
          prj.invalid = prj.orgInvalid || g.invalid;
          prj.visible = !prj.invalid;
          g.nestedGroups.push(prj.id)
        }

        let l = this.labels.get(this.getResourceId(sheetId, 'label', p.label));
        console.log(`initializeProject: label: ${this.getResourceId(sheetId, 'label', p.label)} ${JSON.stringify(l)}`);
        if(l) {
          l.nestedGroups.push(prj.id);
        }

        this.projects.add(prj);
      });
    });
  }

  initializeSchedules() {
    if(this.projects.length == 0) {
      new Error('schedules must initialize after projects and projectGroups');
    }
    Object.entries(this.rawData).forEach(([sheetId, data])=>{
      data['schedules'].forEach((s, i) =>{
        if(!s['id'] || !s['start']) {
          return;
        }

        let g = this.projectGroups.get(this.getResourceId(sheetId, 'projectGroup', s.projectGroup));
        let p = this.projects.get(this.getResourceId(sheetId, 'project', s.project));
        let parentObj = p || g;
        var color = !!s['color'] ? s.color: parentObj ? parentObj.color : 'black';
        if(color === 'white') {
          color = 'black';
        }
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
          assignee: s.assignee,
          invalid: s.invalid,
          type: !!s.type ? s.type : 'range',
          start: moment.tz(s.start.replace("Z", ""), moment.HTML5_FMT.DATETIME_LOCAL_MS, "UTC"),
          end: (!!s['end'])
            ? moment.tz(s.end.replace("Z", ""), moment.HTML5_FMT.DATETIME_LOCAL_MS, "UTC")
            : null,
        };
        this.schedules.add(sched);
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
        projectGroup: schedule.projectGroup,
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
        .rpc('addSchedule', scheduleJson);
    });
  }
}
