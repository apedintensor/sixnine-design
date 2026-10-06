# 映序 Studio：创作路线与无限画布

当前 v6 入口是[短剧工作台与无限画布](series/index.html)。先看[本轮 UX 说明](UX-REVIEW.zh-CN.md)和[用户故事与功能清单](UX-FEATURE-SCOPE.zh-CN.md)；v4 的[十轮记录](ITERATION-REPORT.zh-CN.md)作为历史证据保留。旧 [Freestyle](prototype/index.html) 仍为独立原型。

## 五分钟体验

1. 右上角“项目” → 输入名称 →“创建空白项目”；也可以先体验演示故事。
2. 点击“创作导航”，从想法或已有剧本开始，按七阶段路线整理，也可随时跳转。章节、场戏、镜头仍可自己新增，右侧修改会保存到同一项目。
3. 在创作导航第3步建立人物多造型与图集，绑定到场戏或单镜头；在参考素材上传图片、视频或音频。用“关联素材”明确人物、首帧、动作或声音用途。
4. 顶部切换“无限画布”，添加节点、移动、连线、搜索，再回到引导工作台核对同一份内容。画布位置不改变剧情顺序；在详情用上移 / 下移调整顺序。
5. 在创作导航体验候选选择、返修与状态演示；选择参考有效片段，在声音工作台安排本地音轨并试听，再进入交付检查；这些演示不会实际调用模型。章节分镜预演可显示选定的示例图、已有素材或文字占位，不等于成片。
6. 离开前点“备份”。ZIP 包含文件，可在“项目”导入；结构 JSON 不含文件。缺失文件先补传，备份不是成片。

## 本机运行

本次预览地址：`http://127.0.0.1:8843/video-studio-design/series/`。

服务停止后，在 `C:/Users/danmo/Desktop/inference` 执行：

```powershell
python -m http.server 8843 --bind 127.0.0.1
```

若解压后直接在本目录启动同一命令，则入口是 `http://127.0.0.1:8843/series/`。模块版页面需要 HTTP 服务，不要直接双击 HTML。

修改源码后，在 `studio-app` 运行：

```powershell
npm ci
npm test
npm run build
```

## 文件与边界

- `ITERATION-REPORT.zh-CN.md / .html`：十轮处理、证据、未满意之处和下一轮故事。
- `studio-app/src/`：共享数据、引导界面、实际 React Flow 画布、媒体与导入导出。
- `series/`：已经构建的工作台；`qa/`：隔离浏览器检查、单元结果与截图。
- `research/iteration-best-practices.md`：改动前的故事和标准，不能单独视为通过证明。
- `SERIES-DESIGN.zh-CN.md`、`CANVAS-DECISION.zh-CN.md`：较早的专业流程与选型，实现以最新报告为准。

本版是本地单用户交互原型。文本在 localStorage，文件在 IndexedDB；清站点数据会删除本机作品。单文件最多 30 MB，备份中唯一素材合计最多 120 MB。没有登录、云存储、真实生成、Marble 或成片导出，也没有真人可用性测试结论。
