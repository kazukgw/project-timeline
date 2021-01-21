class VisTL {
  constructor(requestUrl, rpcClient, visTLData) {
    this.requestUrl = requestUrl;
    this.rpcClient = rpcClient;
    this.visTLData = visTLData;

    // TODO: 引数からとるよにする
    this.sheetList = JSON.parse($("#data-sheet-list").text());

    this.visTL = null;

    this.groupingState = { GROUP: "group", LABEL: "label" };
    this.currrentGrouping = this.groupingState.GROUP;

    this.foldingsState = { OPEN: "open", CLOSE: "close" };
    this.currentFoldings = this.foldingsState.OPEN;

    this.hiddenGroups = [];

    let url = new URL(this.requestUrl);

    let hidden = url.searchParams.get("hidden");
    this.hiddenGroups = [];
    if (hidden) {
      this.hiddenGroups = inflateJson(hidden);
    }

    let filterSettings = url.searchParams.get("filter");
    this.filterSettings = {
      projectGroup: {},
      project: {},
      schedule: {},
      showArchived: false,
    };
    if (filterSettings) {
      this.filterSettings = inflateJson(filterSettings);
    }

    let range = url.searchParams.get("range");
    this.defaultRange = null;
    if (range) {
      this.defaultRange = inflateJson(range);
    }

    this.defaultDuration = url.searchParams.get("duration");
  }

  create(container) {
    let visData = this.visTLData.getVisData(
      this.hiddenGroups,
      this.filterSettings
    );
    this.visTL = new vis.Timeline(
      container,
      visData.visItems,
      visData.visGroups,
      this.getVisTLOption()
    );

    this.visTL.on("timechanged", (props) => {
      let t = moment(props.time);
      var pointSum = 0;
      this.visTLData.currentVisData.visItems.forEach((s) => {
        // TODO: start , end が なぜか moment オブジェクトでない場合があるので moment で wrap しているが治す必要あり
        if (
          s.type === "range" &&
          moment(s.start).isBefore(t) &&
          moment(s.end).isAfter(t)
        ) {
          pointSum += (s["point"] || 1) * 1;
        }
      });
      // 既存の Marker の タイトル変更だと 描画がなぜかバグるので
      // 再描画したいときは毎回 remove → add するようにした
      this.visTL.removeCustomTime(props.id);
      this.visTL.addCustomTime(props.time, props.id);
      this.visTL.setCustomTimeMarker(`Point Sum: ${pointSum}`, props.id);
    });
  }

  reload() {
    // let sheetList = JSON.parse($("#data-sheet-list").text());
    return this.visTLData.reload(this.sheetList).then(() => {
      if (this.currrentGrouping === this.groupingState.GROUP) {
        this.resetData();
      } else {
        this.resetDataWithLabel();
      }
    });
  }

  sort(sheetId, sheetName) {
    return this.rpcClient.sort(sheetId, sheetName);
  }

  getSelectedSchedule() {
    let ids = this.visTL.getSelection();
    if (ids.length > 0) {
      return this.visTLData.schedules.get(ids[0]);
    }
  }

  getSelectedScheduleProject() {
    let schedule = this.getSelectedSchedule();
    if (schedule == null) {
      return;
    }
    let g = this.visTLData.projects.get(schedule.projectId);
    if (!g["isProject"]) {
      return;
    }
    return g;
  }

  getSettingsAsUrl() {
    let url = new URL(this.requestUrl);

    url.searchParams.delete("range");
    url.searchParams.delete("hidden");
    url.searchParams.delete("filter");

    url.searchParams.set("filter", deflateJson(this.filterSettings));

    if (this.hiddenGroups.length > 0) {
      url.searchParams.set("hidden", deflateJson(this.hiddenGroups));
    }
    let withoutRange = url.href;

    url.searchParams.set(
      "range",
      deflateJson({
        start: this.visTL.range.start,
        end: this.visTL.range.end,
      })
    );
    return {
      url: withoutRange,
      withRange: url.href,
    };
  }

  applyFilter(filterSettings) {
    this.filterSettings = filterSettings;
    if (this.currrentGrouping === this.groupingState.GROUP) {
      this.resetData();
    } else {
      this.resetDataWithLabel();
    }
  }

  changeFoldings(resourceType, openOrClose) {
    let showNested = openOrClose === "open";

    if (this.currrentGrouping === this.groupingState.GROUP) {
      this.resetData(resourceType, showNested);
    } else {
      this.resetDataWithLabel();
    }
  }

  resetData(resourceType, showNested) {
    let visData = this.visTLData.getVisData(
      this.hiddenGroups,
      this.filterSettings
    );
    // NOTE: showNested の状態を維持
    this.visTL.groupsData.get().forEach((g) => {
      let g_ = visData.visGroups.get(g.id);
      if (g_) {
        if (
          resourceType === "projectGroups" ||
          (resourceType === "projects" && g["isProject"])
        ) {
          g_.showNested = showNested != null ? showNested : g["showNested"];
        } else {
          g_.showNested = g["showNested"];
        }
        visData.visGroups.update(g_);
      }
    });
    this.visTL.setData({
      groups: visData.visGroups,
      items: visData.visItems,
    });
    this.currrentGrouping = this.groupingState.GROUP;
  }

  resetDataWithLabel() {
    let visData = this.visTLData.getVisData(
      this.hiddenGroups,
      this.filterSettings
    );
    this.visTL.setData({
      groups: visData.visGroupsByLabel,
      items: visData.visItems,
    });
    this.currrentGrouping = this.groupingState.LABEL;
  }

  restoreHidden() {
    this.hiddenGroups = [];
    this.visTLData.setVisibleTrueAllVisGroup();
    if (this.currrentGrouping === this.groupingState.GROUP) {
      this.resetData();
    } else {
      this.resetDataWithLabel();
    }
  }

  hideGroup(id) {
    this.visTLData.setVisibleFalseAllVisGroup(id);
    this.hiddenGroups.push(id);
    if (this.currrentGrouping === this.groupingState.GROUP) {
      this.resetData();
    } else {
      this.resetDataWithLabel();
    }
  }

  addSchedule(schedule) {
    return this.visTLData.addSchedule(schedule).then(
      (shed) => {
        this.resetData();
        return shed;
      },
      (e) => {
        console.log(new Error(e));
      }
    );
  }

  updateSchedule(schedule) {
    return this.visTLData.updateSchedule(schedule).then(
      (shed) => {
        this.resetData();
        return shed;
      },
      (e) => {
        console.log(new Error(e));
      }
    );
  }

  addProject(project) {
    return this.visTLData.addProject(project).then(
      (shed) => {
        this.resetData();
        return shed;
      },
      (e) => {
        console.log(new Error(e));
      }
    );
  }

  updateProject(project) {
    return this.visTLData.updateProject(project).then(
      (shed) => {
        this.resetData();
        return shed;
      },
      (e) => {
        console.log(new Error(e));
      }
    );
  }

  getVisTLOption() {
    // https://visjs.github.io/vis-timeline/docs/timeline/#Configuration_Options
    return {
      orientation: "top",
      margin: {
        axis: 5,
        item: {
          horizontal: 3,
          vertical: 3,
        },
      },
      preferZoom: false,
      verticalScroll: true,
      multiselect: true,
      multiselectPerGroup: true,
      longSelectPressTime: 600,
      // groupOrder: "id",
      groupOrder: "index",
      start: moment().subtract(3, "months"),
      horizontalScroll: true,
      zoomMax: 100000000000,
      zoomMin: 1000000000,
      tooltip: {
        overflowMethod: "cap",
        delay: 100,
        template: this.getTooltipTemplateFunc(),
      },
      tooltipOnItemUpdateTime: {
        template: this.getTooltipTemplateFunc(),
      },
      template: this.getItemTemplateFunc(),
      visibleFrameTemplate: this.getVisibleFrameTempate(),
      groupTemplate: this.getGroupTemplateFunc(),
      snap: function(date, _scale, _step) {
        return date;
      },
      editable: {
        add: false,
        updateTime: true,
        updateGroup: false,
        remove: false,
        overrideItems: false,
      },
      onMove: this.getOnMoveHandler().bind(this),
      moment: function(date) {
        return vis.moment(date).utcOffset("+09:00");
      },
    };
  }

  getItemTemplateFunc() {
    let defaulTemplate = Handlebars.compile(`
        {{#if link}}
        <a href="{{link}}" target="_blank">
          {{#if assignee}} <span class="badge badge-secondary">{{assignee}}</span> {{/if}}
          {{before}} {{name}}
        </a>
        {{else}}
        <p style="margin: 0">
          {{#if assignee}} <span class="badge badge-secondary">{{assignee}}</span> {{/if}}
          {{before}} {{name}}
        </p>
        {{/if}}
    `);
    return function(schedule, element, _data) {
      let d = {
        link: schedule.link,
        name: schedule.name,
        color: schedule.color,
        assignee: schedule.assignee,
        before: "",
      };
      switch (schedule.type) {
        case "range":
          // $(element).closest('.vis-item') では取得できなかった ...
          var $targ = $(element).parent().parent();
          $targ.css("border-color", d.color);
          if (schedule.status === "pending") {
            $targ.css("background-size", "auto auto");
            $targ.css("background-color", "rgba(255, 255, 255, 1)");
            $targ.css(
              "background-image",
              "repeating-linear-gradient(135deg, transparent, transparent 5px, rgba(230, 230, 230, 1) 5px, rgba(230, 230, 230, 1) 10px )"
            );
          }
          const progress = schedule["progress"] * 1;
          if (progress >= 100) {
            d["before"] = "✅";
          } else if (100 > progress && moment().isBetween(schedule["start"], schedule["end"])) {
            d["before"] = "🏃";
          } else if (100 > progress && progress > 0 && moment().isAfter(schedule["end"])) {
            d["before"] = "🚩";
          }

          return defaulTemplate(d);
        case "point":
          var $targ = $(element).next("div");
          $targ.css("border-color", d.color);
          return defaulTemplate(d);
        case "background":
          var $targ = $(element).parent();
          $targ.css("background-color", d.color);
          $targ.css("opacity", "0.15");
          return d.name;
      }
    };
  }

  getVisibleFrameTempate() {
    let defaulTemplate = Handlebars.compile(`
        {{#if progress}}
        <div class="progress" style="border-radius: 0px">
          <div class="progress-bar bg-secondary" role="progressbar" style="width: {{progress}}%;" aria-valuenow="{{progress}}" aria-valuemin="0" aria-valuemax="100">{{progress}}%</div>
        </div>
        {{/if}}
    `);
    return function(schedule, _element, _data) {
      let progress = parseInt(schedule.progress);
      var d = { progress: progress };
      switch (schedule.type) {
        case "range":
          return defaulTemplate(d);
      }
      return "";
    };
  }

  getGroupTemplateFunc() {
    let defaulTemplate = Handlebars.compile(`
      <div>
        <p style="font-weight: 600">
          {{#if link}}
            <a href="{{link}}" target="_blank">{{name}}</a>
            {{#if nestedGroupNum}} <span class="badge badge-dark">{{nestedGroupNum}}</span> {{/if}}
          {{else}}
            {{name}}
            {{#if nestedGroupNum}} <span class="badge badge-dark">{{nestedGroupNum}}</span> {{/if}}
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
            <a style="color: {{color}}" href="{{link}}" target="_blank">{{before}} {{name}}</a>
            {{#if nestedGroupNum}} <span class="badge badge-dark">{{nestedGroupNum}}</span> {{/if}}
          {{else}}
            {{before}} {{name}}
            {{#if nestedGroupNum}} <span class="badge badge-dark">{{nestedGroupNum}}</span> {{/if}}
          {{/if}}

          {{#if assignee}} <span class="badge badge-info">{{assignee}}</span> {{/if}}

          {{#if label}}
            <span class="badge badge-secondary">{{label}}</span>
          {{/if}}
          {{#if isNotTask}}
          <button data-group="{{id}}" class="mybtn mybtn-hide"><i class="fa fa-eye-slash"></i></button>
          {{/if}}
        </p>
      </div>
    `);
    return function(group, element, _data) {
      let d = {
        id: group.id,
        name: group.name,
        color: group.color,
        assignee: group["assignee"],
        label: group["label"],
        nestedGroupNum: group["nestedGroups"]
          ? group["nestedGroups"].length > 0
            ? group["nestedGroups"].length
            : null
          : null,
        sheetName: group.sheetName.trim().replace("Project Roadmap:", "").trim(),
        sheetUrl: group.sheetUrl,
        link: group.link,
        isNotTask: !group["task"],
        before: "",
      };
      if (group["isLevel0Group"]) {
        $(element).closest(".vis-label").css("background-color", group.color);
        return defaulTemplate(d);
      }
      if (group["task"]) {
        const progress = group["progress"] * 1;
        if (progress >= 100) {
          d["before"] = "✅";
        } else if (group["type"] === "point" && moment().isAfter(group["start"])) {
          d["before"] = "✅";
        } else if (100 > progress && moment().isBetween(group["start"], group["end"])) {
          d["before"] = "🏃";
        } else if (100 > progress && progress > 0 && moment().isAfter(group["end"])) {
          d["before"] = "🚩";
        }
      }
      return nestedGroupTemplate(d);
    };
  }

  getTooltipTemplateFunc() {
    let pointTemplate = Handlebars.compile(`
      <p style="font-weight: 700"> {{name}} </p>
      <span> 開始: {{start}} </span><br>
      <br>
      <pre>{{description}}</pre>
    `);
    let rangeTemplate = Handlebars.compile(`
      <p style="font-weight: 700"> {{name}} </p>
      <span> 開始: {{start}} </span><br>
      <span> 終了: {{end}} </span><br>
      <span> 期間: {{duration}}日 </span><br>
      <br>
      <pre>{{description}}</pre>
    `);
    return function(item, _element, _data) {
      let d = {
        name: item.name,
        description: item.description,
        start: moment(item.start).format("YYYY/MM/DD"),
        end: moment(item.end).format("YYYY/MM/DD"),
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
        (e) => {
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

  reload(sheetList) {
    this._rawData = null;

    this.labels = this._newDataSet();
    this.projectGroups = this._newDataSet();
    this.projects = this._newDataSet();
    this.tasks = this._newDataSet();
    this.schedules = this._newDataSet();

    this.currentVisData = null;

    return this.initializeData(sheetList);
  }

  setVisibleTrueAllVisGroup() {
    let setVisibleTrue = function(groups) {
      groups.forEach((g) => {
        groups.update({ id: g.id, visible: true });
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
      groups.update({ id: g.id, visible: false });
    };
    setVisibleFalse(id, this.labels);
    setVisibleFalse(id, this.projectGroups);
    setVisibleFalse(id, this.projects);
  }

  addSchedule(schedule) {
    return this.rpcClient.addSchedule(schedule).then((scheduleHasId) => {
      return new Promise((resolve, _) => {
        let sheet = this.sheets[schedule.sheetId];
        let index = this.schedules.length + 1;
        let sched = this.converter.convertSchedule(sheet, scheduleHasId, index);
        this.schedules.add(sched);
        resolve(sched);
      });
    });
  }

  updateSchedule(schedule) {
    let s = this.schedules.get(schedule.id);
    s.projectGroup = schedule.projectGroup;
    s.project = schedule.project;
    s.index = schedule.index;
    s.task = schedule.task;
    s.type = schedule.type;
    s.name = schedule.name;
    s.description = schedule.description;
    s.assignee = schedule.assignee;
    s.progress = schedule.progress;
    s.link = schedule.link;
    s.archive = schedule.archive;
    s.invalid = schedule.invalid;
    // NOTE: 引数として渡される schedule の start, end, estimated_start, estimated_end が
    // moment の objectになっていないケースがあるのでここで wrap する。
    // (全体的にどこで moment の Object にするかちゃんと定まってないからなのでリファクタの必要がある)
    // また end については再度時刻を設定する(これをしないと Timeline での表示が1日分過去にずれる)。
    s.start = moment(schedule.start);
    s.end = moment(schedule.end).hours(23).minutes(59).seconds(59);
    s.estimated_start = schedule.estimated_start
      ? moment(schedule.estimated_start)
      : null;
    s.estimated_end = schedule.estimated_end
      ? moment(schedule.estimated_end).hours(23).minutes(59).seconds(59)
      : null;
    return this.rpcClient.updateSchedule(s).then(() => {
      this.schedules.update(s);
      return s;
    });
  }

  addProject(project) {
    return this.rpcClient.addProject(project).then((projectHasId) => {
      return new Promise((resolve, _) => {
        let sheet = this.sheets[project.sheetId];
        let index = this.projects.length + 1;
        let prj = this.converter.convertProject(sheet, projectHasId, index);
        this.projects.add(prj);
        resolve(prj);
      });
    });
  }

  updateProject(project) {
    let s = this.projects.get(project.id);
    s.projectGroup = project.projectGroup;
    s.name = project.name;
    s.assignee = project.assignee;
    s.label = project.label;
    s.color = project.color;
    s.archive = project.archive;
    return this.rpcClient.updateProject(s).then(() => {
      this.projects.update(s);
      return s;
    });
  }

  getVisData(hiddenGroupIds, filterSettings) {
    var d = {
      labels: this._newDataSet(this.labels.get()),
      projectGroups: this._newDataSet(this.projectGroups.get()),
      projects: this._newDataSet(this.projects.get()),
      tasks: this._newDataSet(),
      schedules: this._newDataSet(this.schedules.get()),
    };
    d = this._setRelatedAndInheritedProps(d);
    d = this._filterVisible(d, hiddenGroupIds, filterSettings);

    const tasks = d.tasks.get({ order: "start" });
    tasks.forEach((t, i) => t["index"] = i);

    let visGroups = this._newDataSet(
      d.projectGroups.get().concat(d.projects.get()).concat(tasks)
    );

    // 多段ネストになるのを防ぐために projectGroups 複製 & nestedGroups は null を設定してから初期化
    let grps = d.projectGroups.map((g) => {
      let grp = Object.assign({}, g);
      grp.nestedGroups = null;
      return grp;
    });
    let visGroupsByLabel = this._newDataSet(
      d.labels.get().concat(grps).concat(d.projects.get())
    );

    let estimated_tasks = this._newDataSet();
    d.schedules.forEach((s) => {
      if (s["task"] && s["estimated_start"] && s["estimated_end"]) {
        let et = Object.assign({}, s);
        et["id"] = et["id"] + "_estimated";
        et["start"] = et["estimated_start"];
        et["end"] = et["estimated_end"];
        et["type"] = "background";
        estimated_tasks.add(et);
      }
    });

    let visItems = this._newDataSet(
      d.schedules.get().concat(estimated_tasks.get())
    );

    this.currentVisData = {
      visGroups: visGroups,
      visGroupsByLabel: visGroupsByLabel,
      visItems: visItems,
    };
    return this.currentVisData;
  }

  initializeData(sheetList) {
    let sheetIdList = [];
    sheetList.forEach((s) => {
      sheetIdList.push(s.id);
      this.sheets[s.id] = s;
    });

    return this.rpcClient.getAllData(sheetIdList).then((rawData) => {
      this._rawData = rawData;
      this._rawData.forEach((d) => {
        let sheet = this.sheets[d.sheetId];
        let data = d.data;
        data["labels"].forEach((l, i) => {
          if (!l["name"]) {
            return;
          }
          var l_ = this.converter.convertLabel(sheet, Object.assign({}, l), i);
          if (!this.labels.get(l_.id)) {
            this.labels.add(l_);
          }
        });

        data["projectGroups"].forEach((g, i) => {
          if (!g["name"]) {
            return;
          }
          let index = sheet.order * 1000 + i;
          let pg_ = this.converter.convertProjectGroup(
            sheet,
            Object.assign({}, g),
            index
          );
          if (!this.projectGroups.get(pg_.id)) {
            this.projectGroups.add(pg_);
          }
        });

        data["projects"].forEach((p, i) => {
          if (!p["name"]) {
            return;
          }
          let p_ = this.converter.convertProject(
            sheet,
            Object.assign({}, p),
            i
          );
          if (!this.projects.get(p_.id)) {
            this.projects.add(p_);
          }
        });

        data["schedules"].forEach((s, i) => {
          if (!s["_id"] || !s["start"]) {
            return;
          }

          if (s["task"] && !s["project"]) {
            return;
          }

          let s_ = this.converter.convertSchedule(
            sheet,
            Object.assign({}, s),
            i
          );
          if (!this.schedules.get(s_.id)) {
            this.schedules.add(s_);
          }
        });
      });
    });
  }

  _filterVisible(data, hiddenGroupIds, filterSettings) {
    filterSettings = filterSettings || {
      showArchived: false,
      projectGroup: {},
      project: {},
      schedule: {},
    };
    var regexFilter = { projectGroup: {}, project: {}, schedule: {} };
    for (var k in filterSettings.projectGroup) {
      regexFilter.projectGroup[k] = !!filterSettings.projectGroup[k]
        ? new RegExp(filterSettings.projectGroup[k])
        : null;
    }
    for (var k in filterSettings.project) {
      regexFilter.project[k] = !!filterSettings.project[k]
        ? new RegExp(filterSettings.project[k])
        : null;
    }
    for (var k in filterSettings.schedule) {
      regexFilter.schedule[k] = !!filterSettings.schedule[k]
        ? new RegExp(filterSettings.schedule[k])
        : null;
    }

    hiddenGroupIds = hiddenGroupIds || [];
    let projectGroups = this._newDataSet(
      data.projectGroups.get({
        filter: (g) => {
          if (g.invalid) return false;
          if (!filterSettings.showArchived && g["archive"]) return false;
          if (!g.visible) return false;
          if (hiddenGroupIds.indexOf(g.id) > -1) return false;
          for (var k in regexFilter.projectGroup) {
            if (regexFilter.projectGroup[k] == null) {
              continue;
            }
            if (g[k].match(regexFilter.projectGroup[k]) == null) {
              return false;
            }
          }
          return true;
        },
      })
    );

    let projects = this._newDataSet(
      data.projects.get({
        filter: (p) => {
          if (p.invalid) return false;
          if (!filterSettings.showArchived && p["archive"]) return false;
          if (!p.visible) return false;
          if (hiddenGroupIds.indexOf(p.id) > -1) return false;

          for (var k in regexFilter.project) {
            if (regexFilter.project[k] == null) {
              continue;
            }
            if (p[k].match(regexFilter.project[k]) == null) {
              return false;
            }
          }

          if (!p.projectGroup) return true;
          if (projectGroups.get(p.projectGroupId)) return true;

          return false;
        },
      })
    );

    let tasks = this._newDataSet(
      data.tasks.get({
        filter: (t) => {
          if (t.invalid) return false;
          if (!t.visible) return false;
          if (hiddenGroupIds.indexOf(t.id) > -1) return false;

          for (var k in regexFilter.task) {
            if (regexFilter.task[k] == null) {
              continue;
            }
            if (t[k].match(regexFilter.task[k]) == null) {
              return false;
            }
          }

          if (projects.get(t.projectId)) return true;

          return false;
        },
      })
    );

    // filter され有効になった projects で再度 projectGroup にふくまれる
    // nestedGroups を変更する
    projectGroups.forEach((g) => {
      if (g.nestedGroups.length > 0) {
        let newNestedGroups = [];
        g.nestedGroups.forEach((ng) => {
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
        filter: (l) => {
          if (l.invalid) return false;
          if (!l.visible) return false;
          if (hiddenGroupIds.indexOf(l.id) > -1) return false;
          return true;
        },
      })
    );

    labels.forEach((l) => {
      if (l.nestedGroups) {
        let newNestedGroups = [];
        l.nestedGroups.forEach((ng) => {
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
        filter: (s) => {
          if (s.invalid) return false;
          if (!filterSettings.showArchived && s["archive"]) return false;

          for (var k in regexFilter.schedule) {
            if (regexFilter.schedule[k] == null) {
              continue;
            }
            if (s[k].match(regexFilter.schedule[k]) == null) {
              return false;
            }
          }

          if (!s.group) return true;
          if (tasks.get(s.group)) return true;
          if (projects.get(s.group)) return true;
          if (projectGroups.get(s.group)) return true;
          return false;
        },
      })
    );

    tasks = this._newDataSet(
      tasks.get({
        filter: (t) => {
          let s = schedules.get({
            filter: (s) => {
              return s.group === t.id;
            },
          });
          return s.length > 0;
        },
      })
    );

    // ↑ と同様に filter され有効になった tasks で再度 projects にふくまれる
    // nestedGroups を変更する
    projects.forEach((p) => {
      if (p.nestedGroups.length > 0) {
        let newNestedGroups = [];
        p.nestedGroups.forEach((ng) => {
          if (tasks.get(ng)) {
            newNestedGroups.push(ng);
          }
        });
        p.nestedGroups = newNestedGroups;
        projects.update(p);
      }
    });

    return {
      labels: labels,
      projectGroups: projectGroups,
      projects: projects,
      tasks: tasks,
      schedules: schedules,
    };
  }

  _setRelatedAndInheritedProps(data) {
    data.labels.forEach((l) => {
      l.nestedGroups = [];
      l.color = l.color || "white";
      data.labels.update(l);
    });

    data.projectGroups.forEach((g) => {
      let l = data.labels.get(this.converter.getLabelId(g.sheetId, g.label));
      if (l) {
        l.nestedGroups.push(g.id);
      }
      g.nestedGroups = [];
      g.color = g.color || "white";
      data.projectGroups.update(g);
    });

    data.projects.forEach((p) => {
      let l = data.labels.get(this.converter.getLabelId(p.sheetId, p.label));
      if (l) {
        l.nestedGroups.push(p.id);
        data.labels.update(l);
      }

      p.nestedGroups = [];
      let g = data.projectGroups.get(
        this.converter.getProjectGroupId(p.sheetId, p.projectGroup)
      );
      if (g) {
        g.nestedGroups.push(p.id);
        data.projectGroups.update(g);
        p.color = p.color || g.color || "black";
        if (p.color === "white") {
          p.color = "black";
        }
        p.group = g.id;
        p.projectGroupId = g.id;
        p.visible = !p.invalid;
      }
      data.projects.update(p);
    });

    data.schedules.forEach((s) => {
      if (s["task"]) {
        let task = this.converter.convertTaskFromSchedule(
          s.sheet,
          Object.assign({}, s),
          s.index
        );
        let p = data.projects.get(
          this.converter.getProjectId(s.sheetId, s.project)
        );
        if (p) {
          p.nestedGroups.push(task.id);
          data.projects.update(p);

          task.color = "gray";
          task.group = p.id;
          task.projectId = p.id;
          task.visible = !task.invalid;
        }
        data.tasks.add(task);
        if (task && p) {
          s.group = task.id;
          s.taskId = task.id;
          s.projectId = task.projectId;
          s.visible = !task.invalid;
          var color = s.color || p.color || "black";
          if (color === "white") {
            color = "black";
          }
          s.color = color;
          data.schedules.update(s);
        }
        return;
      }

      let g = data.projectGroups.get(
        this.converter.getProjectGroupId(s.sheetId, s.projectGroup)
      );
      let p = data.projects.get(
        this.converter.getProjectId(s.sheetId, s.project)
      );
      s.projectId = p ? p.id : null;
      let parentObj = p || g;
      s.group = parentObj ? parentObj.id : null;
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
    return new vis.DataSet(data);
  }
}

class VisDataConverter {
  getLabelId(sheetId, name) {
    return `${sheetId}##label##${name}`;
  }

  convertLabel(sheet, label, index) {
    return Object.assign(label, {
      id: this.getLabelId(sheet.id, label.name),
      nestedGroups: null,
      showNested: true,
      visible: true,

      index: index,
      sheet: sheet,
      sheetId: sheet.id,
      sheetName: sheet.name,
      sheetUrl: sheet.url,
      isLevel0Group: true,
      isLabel: true,
    });
  }

  getProjectGroupId(sheetId, name) {
    return `${sheetId}##projectgroup##${name}`;
  }

  convertProjectGroup(sheet, projectGroup, index) {
    return Object.assign(projectGroup, {
      id: this.getProjectGroupId(sheet.id, projectGroup.name),
      nestedGroups: null,
      visible: !projectGroup.invalid,
      showNested: true,

      index: index,
      sheet: sheet,
      sheetId: sheet.id,
      sheetName: sheet.name,
      sheetUrl: sheet.url,
      isLevel0Group: true,
      isProjectGroup: true,
    });
  }

  getProjectId(sheetId, name) {
    return `${sheetId}##project##${name}`;
  }

  convertProject(sheet, project, index) {
    return Object.assign(project, {
      id: this.getProjectId(sheet.id, project.name),
      group: null,
      visible: !project.invalid,
      showNested: false,

      // NOTE: index (group の並び順 の値を無理やり変更)
      // TODO: もうちょっときれいなやり方にする
      // index: index,
      // index: this.getProjectId(sheet.id, project.name),
      index: index,
      isProject: true,
      sheet: sheet,
      sheetId: sheet.id,
      sheetName: sheet.name,
      sheetUrl: sheet.url,
      projectGroupId: null,
    });
  }

  getTaskId(sheetId, id) {
    return `${sheetId}##task##${id}`;
  }

  convertTaskFromSchedule(sheet, scheduleObj, index) {
    return Object.assign(scheduleObj, {
      id: this.getTaskId(sheet.id, scheduleObj._id),
      group: null,
      visible: !scheduleObj.invalid,
      editable: {
        add: false,
        updateTime: true,
        updateGroup: false,
        remove: false,
        overrideItems: false,
      },

      task: true,
      scheduleId: this.getScheduleId(sheet.id, scheduleObj._id),
      index: index,
      sheet: sheet,
      sheetId: sheet.id,
      sheetName: sheet.name,
      sheetUrl: sheet.url,
      projectId: null,
    });
  }

  getTaskScheduleId(sheetId, id) {
    // NOTE: ##schedule## となっているが間違いではない
    return `${sheetId}##schedule##${id}`;
  }

  // NOTE: scheduleのDataではなく ScheduleObjectを引数としてとる
  convertTaskScheduleFromSchedule(sheet, scheduleObj, index) {
    let o = Object.assign(scheduleObj, {
      id: this.getTaskScheduleId(sheet.id, scheduleObj._id),
      group: null,
      type: scheduleObj.type || "range",

      start: scheduleObj.start,
      end: scheduleObj.end,
      description: scheduleObj["description"],

      isTaskSchedule: true,
      isTask: true,
      index: index,
      sheet: sheet,
      sheetId: sheet.id,
      sheetName: sheet.name,
      sheetUrl: sheet.url,
      projectId: null,
    });
    o.editable = {
      add: false,
      updateTime: true,
      updateGroup: false,
      remove: false,
      overrideItems: false,
    };
    return o;
  }

  getScheduleId(sheetId, id) {
    return `${sheetId}##schedule##${id}`;
  }

  convertSchedule(sheet, schedule, index) {
    // NOTE: schedule の start と end は SpreadSheet の日時を JST として評価した上で UTC で返却されるので
    // 一日すすめてからさらに時刻を指定する。
    var start = moment(schedule.start.replace("Z", ""))
      .add(1, "day")
      .hours(0)
      .minutes(0)
      .seconds(0);
    var end = schedule["end"]
      ? moment(schedule.end.replace("Z", "")).add(1, "day")
      : moment(start).add(2, "week");

    // NOTE: 終了日の 23:59:59 を設定
    end.hours(23).minutes(59).seconds(59);

    var estimated_start, estimated_end;
    if (
      schedule["task"] &&
      schedule["estimated_start"] &&
      schedule["estimated_end"]
    ) {
      estimated_start = moment(schedule["estimated_start"].replace("Z", ""))
        .add(1, "day")
        .hours(0)
        .minutes(0)
        .seconds(0);
      estimated_end = moment(schedule["estimated_end"].replace("Z", "")).add(
        1,
        "day"
      );
      estimated_end.hours(23).minutes(59).seconds(59);
    }

    let o = Object.assign(schedule, {
      id: this.getScheduleId(sheet.id, schedule._id),
      group: null,
      type: schedule.type || "range",

      start: start,
      end: end,
      description: schedule["description"],

      estimated_start: estimated_start,
      estimated_end: estimated_end,
      isSchedule: true,
      index: index,
      sheet: sheet,
      sheetId: sheet.id,
      sheetName: sheet.name,
      sheetUrl: sheet.url,
      projectId: null,
      projectGroupId: null,
    });
    o.editable = {
      add: false,
      updateTime: true,
      updateGroup: false,
      remove: false,
      overrideItems: false,
    };
    return o;
  }
}
