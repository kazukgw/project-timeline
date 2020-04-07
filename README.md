# Project Timeline Visualizer

SpreadSheet の情報をもとに Project の Timeline を可視化するツール

![screen-shot](https://raw.githubusercontent.com/kazukgw/project-timeline/master/screenshot_01.png)


# TODO

- [x] 指定した色でのカラーリング
- [x] group hide
- [x] point も update できるように
- [ ] vis-timeline の option をシートから指定できるように
- [ ] filter
- [x] query parameter に sheet id で 指定して読みだせるように
- [ ] Schedule の Insert/Update 時はロックをかける
- [x] Label 絡むの追加とグルーピング
- [x] Template Engine or React によるレンダリング
- [ ] record の追加機能
- [x] ~~position: fixed → stick~~
- [x] range 変更時は range の style 変更 (border を dashed にするとか)
- [ ] Enriching the tooltip display content
- [ ] Hide records that are set to hidden on SpreadSheet regardless of the client's settings.
  - restore したときも hidden: true のアイテムは visible false のままにする
- [ ] Allow the setting of Hidden to be specified with a query parameter
- [ ] Allowing config to be defined in json
  - コードがスリムになる
  - 柔軟に設定できるようになる
- [ ] Supports parallel data acquisition from the client.
- [ ] GAS ベースの CMS 構想考える
