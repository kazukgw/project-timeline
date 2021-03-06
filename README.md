# Project Timeline Visualizer

A tool to visualize project timelines based on the information defined in Google SpreadSheet.

It's written in Google Apps Script.

![screen-shot](https://raw.githubusercontent.com/kazukgw/project-timeline/master/screenshot_01.png)


# TODO

- [x] 指定した色でのカラーリング [x] group hide
- [x] point も update できるように
- [x] query parameter に sheet id で 指定して読みだせるように
- [x] Schedule の Insert/Update 時はロックをかける
- [x] Label 絡むの追加とグルーピング
- [x] Template Engine or React によるレンダリング
- [x] record の追加機能
  - button click → dialog → insert
- [x] ~~position: fixed → stick~~
- [x] range 変更時は range の style 変更 (border を dashed にするとか)
- [x] Hide records that are set to hidden on SpreadSheet regardless of the client's settings.
  - restore したときも hidden: true のアイテムは visible false のままにする
- [x] Allowing config to be defined in json
  - コードがスリムになる
  - 柔軟に設定できるようになる
- [x] Supports parallel data acquisition from the client.
- [x] spreadsheet bounded な script とから unbounded script に変更する
- [x] Add a link to the Group's Content.
- [x] Enriching the tooltip display content
- [x] Edit Schedule
  - Title, Assignee
- [x] Enables link to be set when schedule is created
- [x] Toggle Folding
- [x] Allow the setting of Hidden to be specified with a query parameter
- [x] ~~Adding a Hide Schedule Button~~
- [x] ~~vis-timeline の option をシートから指定できるように~~
- [x] Add 時に Start/End も指定できるようにする
- [x] Query Parameter で Zoom Level を指定できるようにする
- [x] Refactoring #1 (Add comment, Error handling)
- [x] filter by assignee
- [ ] Reload Button
- [ ] フロントエンドのコードの TypeScript化
- [ ] Create a color palette
- [ ] Enhance the development environment
- [ ] Auto test
