# 快速聊天设计索引与审查结果

2026-10-05 Australia/Sydney。本轮交付为用户最新要求的“整体产品/系统设计→核对旧系统→保留/改造/重写→拆开发任务”，不是新页面/新API已实现的报告。初步直接适配已停止，未启用草稿未接入页面或服务。本地集成仍待后续批次，最终上线须用户确认。

## 阅读入口

1. [整体产品与系统设计](C:/Users/danmo/Desktop/inference/video-studio-design/QUICK-CHAT-PRODUCT-SYSTEM-DESIGN.zh-CN.md)：用户路径、数据关系、权威/事务、助手、执行反馈、一次码与保留改造表。
2. [统一API/数据契约](C:/Users/danmo/Desktop/inference/video-studio-design/QUICK-CHAT-API-CONTRACT.zh-CN.md)：目标端点、输入/版本、跨调用者幂等、重试/准入恢复、权限与连接流程。
3. [纵向实施批次与验收](C:/Users/danmo/Desktop/inference/video-studio-design/QUICK-CHAT-IMPLEMENTATION-BACKLOG.zh-CN.md)：7个实施/验收批次，网页/Agent同能力，而非分散组件。
4. [现有后端核验](C:/Users/danmo/Desktop/inference/h3-studio/QUICK-CHAT-BACKEND-AUDIT.zh-CN.md)：从真实本地源码确认有效能力和缺口。
5. [一次码安全设计审查](C:/Users/danmo/Desktop/inference/h3-studio/AGENT-CONNECT-CONTRACT.zh-CN.md)：授权、并发兑换、丢响应恢复与安全存储；最终模式以统一契约为准。

原始体验基准是 `quick-chat-mock/IMPLEMENTATION-HANDOFF.zh-CN.md` 及同目录mock；未改mock布局/假逻辑，也未将其当生产实现。

## 两轮设计审查

首轮由前端体验、后端事务/任务、一次码安全三方分别独立走查。没有指出需要推翻整体方向的P0，但指出以下必须修正的P1；根设计已补相应契约。第二轮是集成负责人对修正后文档的交叉核对，不是实现/运行验收。

| 审查发现 | 最终设计修正 |
|---|---|
| 旧镜头与聊天卡可各自变成当前真值 | 新创作权威、不可变revision、内部执行投影、旧写入口禁止绕过 |
| actor级Key无法防网页/不同Agent同卡双投 | owner+revision唯一submission；真实caller审计与稳定business namespace分开 |
| 不同Agent对同失败项retry仍可双投 | owner+item+retry_of_execution唯一、item.current_execution CAS |
| 唯一submission导致未准入份无恢复出口 | 独立resume-admission、scope item预检、恢复原planned job；不重投成功项 |
| timeline seq没有后台执行事件来源 | 首版持久创作seq与active submission独立轮询；GET不写事件 |
| CPU裁片/默认参数会破坏不可变revision | requested_input_hash / resolved_execution_hash / projection hash三层分离 |
| 未参与材料刷新后无法保持 | 完整MaterialBinding catalog、enabled/version/用途/选段；input_refs只读派生 |
| Agent仍需理解旧project_id上传 | 会话原生assets薄adapter，服务端解析内部归属 |
| 单Send行为含糊/前端正则硬猜 | 默认assist由受限语义决定，discuss只讨论，none只保存；propose是输出intent |
| text-only不能完成看图/动作体验 | 必须媒体适配工作包、逐模型状态、实际media_input_manifest与明确验收门槛 |
| 未来新增scope可能扩已发连接码 | 发码冻结确切授权/profile/期限，旧码/旧PAT不自动获新scope |
| helper不能核对Key归属 | authorization_fingerprint断言、成功授权快照、核对origin/owner后激活 |

另补匿名暂存文件的刷新风险、输入归属、登录自动建会话、切账户上传恢复、取消与已计费的区别。

## 本轮验证与限制

- 实际阅读文件与现有路由/服务核验；中央service/profile元信息查询，无凭据值。
- 文档内部契约、来源路径与审查问题覆盖检查；没有运行完整测试，因为未接运行逻辑。
- 没有LLM生成、媒体理解、H3/GPU、云资源操作、部署或线上健康验收。
- `studio-app/src/quick-chat-model.js`、`h3-studio/studio_platform/agent_connect.py`仍是未启用早期草稿；需重新审查，不算完成批次。
- 原故事、旧快速创作、账户、素材、任务与账本保留。后续本地批次验收后给用户看可操作的真实界面，批准前不发布。
