class VisTL {
  constructor(requestUrl, rpcClient, visTLData) {
    this.requestUrl = requestUrl;
    this.rpcClient = rpcClient;
    this.visTLData = visTLData;

    this.visTL = null;

    // TODO: enum object を定義する
    // TODO: 名前の変更 (groupByState て意味わからん)
    this.groupByState = "group";
    // TODO: enum object を定義する
    this.foldingsState = "open";
    this.hiddenGroups = [];

    let hidden = new URL(this.requestUrl).searchParams.get("hidden");
    if (hidden) {
      // TODO: JSON.parse(xxx) は メソッドにまとめる
      this.hiddenGroups = JSON.parse(
        pako.inflate(atob(hidden), { to: "string" })
      );
    }
  }

  create(container) {
    let visData = this.visTLData.getVisData(this.hiddenGroups);
    this.visTL = new vis.Timeline(
      container,
      visData.visItems,
      visData.visGroups,
      this.getVisTLOption()
    );
  }

  getSelectedSchedule() {
    let ids = this.visTL.getSelection();
    if (ids.length > 0) {
      return this.visTLData.schedules.get(ids[0]);
    }
  }

  getHiddenSettingsAsUrl() {
    let url = new URL(this.requestUrl);
    if (this.hiddenGroups.length > 0) {
      // TODO: btoa(xxx) は メソッドにまとめる
      let settings = btoa(
        pako.deflate(JSON.stringify(this.hiddenGroups), { to: "string" })
      );
      url.searchParams.set("hidden", settings);
      return url.href;
    }
    url.searchParams.delete("hidden");
    return url.href;
  }

  toggleFoldings() {
    var showNested;
    // TODO: state は enum を使う
    if (this.foldingsState === "open") {
      this.foldingsState = "close";
      showNested = false;
    } else {
      this.foldingsState = "open";
      showNested = true;
    }

    this.visTLData.projectGroups.forEach(g => {
      this.visTLData.projectGroups.update({
        _id: g._id,
        showNested: showNested
      });
    });
    this.visTLData.projects.forEach(g => {
      this.visTLData.projects.update({ _id: g._id, showNested: showNested });
    });
    this.visTLData.labels.forEach(g => {
      this.visTLData.labels.update({ _id: g._id, showNested: showNested });
    });

    if (this.groupByState === "group") {
      this.resetData();
    } else {
      this.resetDataWithLabel();
    }
  }

  resetData() {
    let visData = this.visTLData.getVisData(this.hiddenGroups);
    this.visTL.setData({
      groups: visData.visGroups,
      items: visData.visItems
    });
    this.groupByState = "group";
  }

  resetDataWithLabel() {
    let visData = this.visTLData.getVisData(this.hiddenGroups);
    this.visTL.setData({
      groups: visData.visGroupsByLabel,
      items: visData.visItems
    });
    this.groupByState = "label";
  }

  restoreHidden() {
    this.hiddenGroups = [];
    this.visTLData.setVisibleTrueAllVisGroup();
    if (this.groupByState === "group") {
      this.resetData();
    } else {
      this.resetDataWithLabel();
    }
  }

  hideGroup(id) {
    this.visTLData.setVisibleFalseAllVisGroup(id);
    this.hiddenGroups.push(id);
    if (this.groupByState === "group") {
      this.resetData();
    } else {
      this.resetDataWithLabel();
    }
  }

  addSchedule(schedule) {
    return this.visTLData.addSchedule(schedule).then(
      () => {
        this.resetData();
      },
      e => {
        console.log(new Error(e));
      }
    );
  }

  updateSchedule(schedule) {
    return this.visTLData.updateSchedule(schedule).then(
      () => {
        this.resetData();
      },
      e => {
        console.log(new Error(e));
      }
    );
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
        overflowMethod: "cap",
        delay: 100,
        template: this.getTooltipTemplateFunc()
      },
      tooltipOnItemUpdateTime: {
        template: this.getTooltipTemplateFunc()
      },
      template: this.getItemTemplateFunc(),
      groupTemplate: this.getGroupTemplateFunc(),
      snap: function(date, scale, step) {
        date.setHours(0);
        date.setMinutes(0);
        date.setSeconds(0);
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
        <p style="margin: 0">
          {{#if assignee}} <span class="badge badge-secondary">{{assignee}}</span> {{/if}}
          {{name}}
        </p>
        {{/if}}
    `);
    return function(schedule, element, data) {
      let d = {
        link: schedule.link,
        name: schedule.name,
        color: schedule.color,
        assignee: schedule.assignee
      };
      switch (schedule.type) {
        case "range":
          // $(element).closest('.vis-item') では取得できなかった ...
          var $targ = $(element)
            .parent()
            .parent();
          $targ.css("border-color", d.color);
          return defaulTemplate(d);
        case "point":
          var $targ = $(element).next("div");
          $targ.css("border-color", d.color);
          return defaulTemplate(d);
        case "background":
          var $targ = $(element).parent();
          $targ.css("background-color", d.color);
          $targ.css("opacity", "0.1");
          return d.name;
      }
    };
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
            <a style="color: {{color}}" href="{{link}}" target="_blank">{{name}}</a>
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
        id: group._id,
        name: group.name,
        color: group.color,
        assignee: group["assignee"],
        label: group["label"],
        sheetName: group.sheetName,
        sheetUrl: group.sheetUrl,
        link: group.link
      };
      if (group["isLevel0Group"]) {
        $(element)
          .closest(".vis-label")
          .css("background-color", group.color);
        return defaulTemplate(d);
      }
      return nestedGroupTemplate(d);
    };
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
    return function(item, element, data) {
      let d = {
        name: item.name,
        start: moment(item.start).format("YYYY/MM/DD"),
        end: moment(item.end).format("YYYY/MM/DD")
      };
      if (item.end) {
        d.duration = Math.floor(
          moment.duration(moment(item.end).diff(moment(item.start))).asDays()
        );
      }
      switch (item.type) {
        case "point":
          return pointTemplate(d);
        case "range":
          return rangeTemplate(d);
      }
    };
  }

  getOnMoveHandler() {
    // timeline の オブジェクト移動イベントのハンドラ
    // サーバ側にデータの変更をリクエストする
    // https://visjs.github.io/vis-timeline/docs/timeline/#Editing_Items
    let visTLData = this.visTLData;
    return function(item, callback) {
      visTLData.updateSchedule(item).then(
        // callback に null を渡すと 変更がキャンセルされる
        // https://visjs.github.io/vis-timeline/docs/timeline/#Editing_Items
        () => {
          callback(item);
        },
        e => {
          console.log(new Error(e));
          callback(null);
        }
      );
    };
  }
}

class VisTLData {
  constructor(rpcClient) {
    this.rpcClient = rpcClient;
    this.rawData = {};
    this.sheets = {};
    this.converter = new VisDataConverter();

    this._rawData = null;

    this.labels = this._newDataSet();
    this.projectGroups = this._newDataSet();
    this.projects = this._newDataSet();
    this.schedules = this._newDataSet();

    this.currentVisData = null;
  }

  setVisibleTrueAllVisGroup() {
    let setVisibleTrue = function(groups) {
      groups.forEach(g => {
        groups.update({ _id: g._id, visible: true });
      });
    };
    setVisibleTrue(this.labels);
    setVisibleTrue(this.projectGroups);
    setVisibleTrue(this.projects);
  }

  setVisibleFalseAllVisGroup(id) {
    let setVisibleFalse = function(id, groups) {
      let g = groups.get(id);
      if (!g) {
        return;
      }
      groups.update({ _id: g._id, visible: false });
    };
    setVisibleFalse(id, this.labels);
    setVisibleFalse(id, this.projectGroups);
    setVisibleFalse(id, this.projects);
  }

  addSchedule(schedule) {
    return this.rpcClient.addSchedule(schedule).then(scheduleHasId => {
      let sheet = this.sheets[schedule.sheetId];
      let index = this.schedules.length + 1;
      let sched = this.converter.convertSchedule(sheet, scheduleHasId, index);
      this.schedules.add(sched);
    });
  }

  updateSchedule(schedule) {
    let s = this.schedules.get(schedule._id);
    s.projectGroup = schedule.projectGroup;
    s.project = schedule.project;
    s.type = schedule.type;
    s.name = schedule.name;
    s.assignee = schedule.assignee;
    s.link = schedule.link;
    s.start = moment(schedule.start);
    s.end = moment(schedule.end);
    return this.rpcClient.updateSchedule(s).then(() => {
      this.schedules.update(s);
    });
  }

  getVisData(hiddenGroupIds) {
    var d = {
      labels: this._newDataSet(this.labels.get()),
      projectGroups: this._newDataSet(this.projectGroups.get()),
      projects: this._newDataSet(this.projects.get()),
      schedules: this._newDataSet(this.schedules.get())
    };
    d = this._setRelatedAndInheritedProps(d);
    d = this._filterVisible(d, hiddenGroupIds);

    let visGroups = this._newDataSet(
      d.projectGroups.get().concat(d.projects.get())
    );

    // 多段ネストになるのを防ぐためにnestedGroups は null を設定してから add 初期化する
    d.projectGroups.forEach(g => {
      g.nestedGroups = null;
      d.projectGroups.update(g);
    });
    let visGroupsByLabel = this._newDataSet(
      d.labels
        .get()
        .concat(d.projectGroups.get())
        .concat(d.projects.get())
    );

    let visItems = this._newDataSet(d.schedules.get());

    this.currentVisData = {
      visGroups: visGroups,
      visGroupsByLabel: visGroupsByLabel,
      visItems: visItems
    };
    return this.currentVisData;
  }

  initializeData(sheetList) {
    let sheetIdList = [];
    sheetList.forEach(s => {
      sheetIdList.push(s.id);
      this.sheets[s.id] = s;
    });

    return this.rpcClient.getAllData(sheetIdList).then(rawData => {
      this._rawData = rawData;
      this._rawData.forEach(d => {
        let sheet = this.sheets[d.sheetId];
        let data = d.data;
        data["labels"].forEach((l, i) => {
          if (!l["name"]) {
            return;
          }
          this.labels.add(this.converter.convertLabel(sheet, l, i));
        });

        data["projectGroups"].forEach((g, i) => {
          if (!g["name"]) {
            return;
          }
          this.projectGroups.add(
            this.converter.convertProjectGroup(sheet, g, i)
          );
        });

        data["projects"].forEach((p, i) => {
          if (!p["name"]) {
            return;
          }
          this.projects.add(this.converter.convertProject(sheet, p, i));
        });

        data["schedules"].forEach((s, i) => {
          if (!s["id"] || !s["start"]) {
            return;
          }
          this.schedules.add(this.converter.convertSchedule(sheet, s, i));
        });
      });
    });
  }

  _filterVisible(data, hiddenGroupIds) {
    hiddenGroupIds = hiddenGroupIds || [];
    let projectGroups = this._newDataSet(
      data.projectGroups.get({
        filter: g => {
          if (g.invalid) return false;
          if (!g.visible) return false;
          if (hiddenGroupIds.indexOf(g._id) > -1) return false;
          return true;
        }
      })
    );

    let projects = this._newDataSet(
      data.projects.get({
        filter: p => {
          if (p.invalid) return false;
          if (!p.visible) return false;
          if (hiddenGroupIds.indexOf(p._id) > -1) return false;

          if (!p.projectGroup) return true;
          if (projectGroups.get(p.projectGroupId)) return true;

          return false;
        }
      })
    );

    projectGroups.forEach(g => {
      if (g.nestedGroups.length > 0) {
        let newNestedGroups = [];
        g.nestedGroups.forEach(ng => {
          if (projects.get(ng)) {
            newNestedGroups.push(ng);
          }
        });
        g.nestedGroups = newNestedGroups;
        projectGroups.update(g);
      }
    });

    let labels = this._newDataSet(
      data.labels.get({
        filter: l => {
          if (l.invalid) return false;
          if (!l.visible) return false;
          if (hiddenGroupIds.indexOf(l._id) > -1) return false;
          return true;
        }
      })
    );

    labels.forEach(l => {
      if (l.nestedGroups) {
        let newNestedGroups = [];
        l.nestedGroups.forEach(ng => {
          if (projectGroups.get(ng) || projects.get(ng)) {
            newNestedGroups.push(ng);
          }
        });
        l.nestedGroups = newNestedGroups;
        labels.update(l);
      }
    });

    let schedules = this._newDataSet(
      data.schedules.get({
        filter: s => {
          if (s.invalid) return false;
          if (!s.group) return true;
          if (projects.get(s.group)) return true;
          if (projectGroups.get(s.group)) return true;
          return false;
        }
      })
    );

    return {
      labels: labels,
      projectGroups: projectGroups,
      projects: projects,
      schedules: schedules
    };
  }

  _setRelatedAndInheritedProps(data) {
    data.labels.forEach(l => {
      l.color = l.color || "white";
      data.labels.update(l);
    });

    data.projectGroups.forEach(g => {
      let l = data.labels.get(this.converter.getLabelId(g.sheetId, g.label));
      if (l) {
        l.nestedGroups.push(g._id);
      }
      g.color = g.color || "white";
      data.projectGroups.update(g);
    });

    data.projects.forEach(p => {
      let l = data.labels.get(this.converter.getLabelId(p.sheetId, p.label));
      if (l) {
        l.nestedGroups.push(p._id);
        data.labels.update(l);
      }

      let g = data.projectGroups.get(
        this.converter.getProjectGroupId(p.sheetId, p.projectGroup)
      );
      if (g) {
        g.nestedGroups.push(p._id);
        data.projectGroups.update(g);

        p.color = p.color || g.color || "black";
        p.group = g._id;
        p.projectGroupId = g._id;
        p.invalid = p.orgInvalid || g.invalid;
        p.visible = !p.invalid;
      }
      data.projects.update(p);
    });

    data.schedules.forEach(s => {
      let g = data.projectGroups.get(
        this.converter.getProjectGroupId(s.sheetId, s.projectGroup)
      );
      let p = data.projects.get(
        this.converter.getProjectId(s.sheetId, s.project)
      );
      s.projectGroupId = g ? g._id : null;
      s.projectId = p ? p._id : null;
      let parentObj = p || g;
      s.group = parentObj ? parentObj._id : null;
      var color = s.color || (parentObj && parentObj.color) || "black";
      if (color === "white") {
        color = "black";
      }
      s.color = color;
      data.schedules.update(s);
    });

    return data;
  }

  _newDataSet(data) {
    return new vis.DataSet(data, { fieldId: "_id" });
  }
}

class VisDataConverter {
  getLabelId(sheetId, name) {
    return `${sheetId}##label##${name}`;
  }

  convertLabel(sheet, label, index) {
    return Object.assign(
      {
        _id: this.getLabelId(sheet.id, label.name),
        nestedGroups: [],
        showNested: true,

        index: index,
        sheetId: sheet.id,
        sheetName: sheet.name,
        sheetUrl: sheet.url,
        isLevel0Group: true,
        isLabel: true
      },
      label
    );
  }

  getProjectGroupId(sheetId, name) {
    return `${sheetId}##projectgroup##${name}`;
  }

  convertProjectGroup(sheet, projectGroup, index) {
    return Object.assign(
      {
        _id: this.getProjectGroupId(sheet.id, projectGroup.name),
        nestedGroups: [],
        visible: !projectGroup.invalid,
        showNested: true,

        index: index,
        sheetId: sheet.id,
        sheetName: sheet.name,
        sheetUrl: sheet.url,
        isLevel0Group: true,
        isProjectGroup: true
      },
      projectGroup
    );
  }

  getProjectId(sheetId, name) {
    return `${sheetId}##project##${name}`;
  }

  convertProject(sheet, project, index) {
    return Object.assign(
      {
        _id: this.getProjectId(sheet.id, project.name),
        group: null,
        showNested: true,
        visible: !project.invalid,

        index: index,
        isProject: true,
        sheetId: sheet.id,
        sheetName: sheet.name,
        sheetUrl: sheet.url,
        projectGroupId: null
      },
      project
    );
  }

  getScheduleId(sheetId, id) {
    return `${sheetId}##schedule##${id}`;
  }

  convertSchedule(sheet, schedule, index) {
    var start = schedule.start.replace("Z", "");
    start = moment.tz(start, moment.HTML5_FMT.DATETIME_LOCAL_MS, "UTC");
    var end = schedule["end"]
      ? moment.tz(
          schedule.end.replace("Z", ""),
          moment.HTML5_FMT.DATETIME_LOCAL_MS,
          "UTC"
        )
      : start.add(1, "month");
    return Object.assign(
      {
        _id: this.getScheduleId(sheet.id, schedule.id),
        group: null,
        type: schedule.type || "range",
        editable: {
          add: false,
          updateTime: true,
          updateGroup: false,
          remove: false,
          overrideItems: false
        },

        start: start,
        end: end,

        index: index,
        sheetId: sheet.id,
        sheetName: sheet.name,
        sheetUrl: sheet.url,
        projectId: null,
        projectGroupId: null
      },
      schedule
    );
  }
}
