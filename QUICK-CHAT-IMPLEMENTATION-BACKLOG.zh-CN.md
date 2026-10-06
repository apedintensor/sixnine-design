# 快速创作实施批次与验收标准

2026-10-05 Australia/Sydney。此任务表依据整体设计与统一API契约；用户最新要求先设计再拆任务。本轮尚未把新页面接入正式运行入口。每批本地验收，不部署、不租GPU、不清除原任务/预算。

## 批次0：设计与旧能力核验（本轮完成）

产物：整体产品/system design、统一API与实体契约、本任务表；后端实际API审查与一次码安全设计。确认mock布局可保留、假回复/进度/历史不可搬；发现actor级幂等、双权威、结果导入、文本媒体理解、持久助手运行等缺口。

## 批次1：持久会话与真实素材（纵向可用）

用户故事：作为新用户，我直接放参考和输入想法，登录后保存同一会话，不需要先建立故事；刷新、换标签页、重登后找得回，另一账户看不到。

开发：新Conversation/MaterialBinding/Timeline SQL模型与路由；会话创建隐藏执行容器；上传原收据、片段/参与用途绑定；新快速聊天布局和记录分页；账户fence与未上传文件归属确认；保留旧项目深链及短剧入口。

验收：superdan/supervan隔离、session切换不串素材；catalog中不参与材料刷新后仍保留，H3 input_refs只派生不双写；上传/处理中断恢复同收据，Agent用会话上传而不操作project ID；读历史不写数据；刷新已保存状态一致；未保存composer不被轮询覆盖；匿名文件明确尚未上传。不会产生job、LLM请求或GPU租赁。

## 批次2：不可变任务卡、投影保护与统一创作API

用户故事：作为用户或Agent，我保存完整任务卡并改成新版本，网站和API看到同一个版本；修改下一轮不改变旧卡。

开发：Card/Revision、完整input快照/seed/lineage；copy/edit/revisions；所有H3已封装参数按服务schema组织弹窗；内部投影hash与旧写入口保护；网页/Agent同命令、权限与URL。

验收：uint64边界、多份独立seed保存后稳定；旧快照不可变；参数/素材互斥不偷偷丢引用；能力交集限制和自定义尺寸/guide/视频原声覆盖；旧API不能绕过改投影；外部Agent写卡网页同位置显示，反向读回一致。

## 批次3：预检→确认→独立结果→安全单项重试

用户故事：作为用户，我能一次抽N份，清楚看费用、等待阶段、成功与失败；双击或两个Agent同时确认只形成一批。

开发：抽Admission应用服务、Preflight/Submission/Item/Execution；owner+revision唯一确认与business namespace；复用既有预算/队列/job/attempt/worker，不改原任务身份；状态timeline、有界轮询；取消与有停止证明的单份重试。

验收：网页+两Agent竞争只产生一submission/N个job；不同key/actor重试同失败execution也只产生一次新执行；未准入份resume-admission只恢复原item/原planned job；丢响应重放、任意进程边界中断恢复原item；过期plan不确认；失败保留成功产物；unknown不重投；cancel不能谎称停止；seq不变时活跃submission轮询仍发现完成/失败，GET不写事件；requested/resolved/projection三种hash不混用。离线FakeBackend仅测试边界，不向普通页面自动fallback。

## 批次4：助手语义与持久运行

用户故事：作为用户，我讨论时获得讨论；明确需求形成完整卡片，“只改镜头其他不变”有可检查的继承和改变；模型失效不切模型。

开发：AssistantRun幂等/fence与单运行竞争保护；严格结构化建议解析；上下文来源快照、usage与错误；供应商adapter复用中央凭据入口；准确默认Gemini/另选Gemma；新的assistant:run scope/调用开关。必须新增独立受限媒体理解adapter、逐模型能力schema与media_input_manifest，不把元信息说成视觉理解。

验收：仅文本讨论不创建GPU任务；模型输出无执行授权；参数/收据非法建议拒绝或留用户处理；timeout/restart保持unknown无重复POST；同模型准确ID、无降级；超上下文不暗中截断；调用关闭时明确错误、可手工/Agent写卡。分别核验图片/视频/音频实际发送与理解限制；网页“助手已读取”须来自实际manifest。真实文本/媒体模型验收需要用户另行授权，离线通过不写线上可用；未验收媒体时不能把首图/动作参考场景和整体助手体验标完成。

## 批次5：真实结果复用

用户故事：作为用户，我选某份结果作为下一轮参考，知道用了哪个结果和片段，历史原件不被删除。

开发：Artifact→受保护CPU ResultImport→AssetService；内容hash/格式/时长/大小、份额与条件写入；授权来源/新会话绑定；“用作参考”、选段、lineage；模型不会默认继承输出。

验收：视频/audio分别合法导入；处理失败/未知恢复原import；无任意URL/跨owner获取；同会话与授权跨会话复制显式可见；仅移除引用不删历史/原资产。读取成功artifact不等于import完成。

## 批次6：一次连接码与公共Agent发现

用户故事：作为普通用户，我复制一次说明给Codex就能连接，不学习我们内部Registry；网站显示可撤销连接，Agent拥有同一套创作功能。

开发：连接码表、固定scope/owner/TTL、原子兑换与verifier结果恢复、限流审计；OS安全存储helper；精确匿名兑换豁免与同源保护；sidebar新入口/状态/撤销；Skill/OpenAPI/guide新增全部chat命令，手工Key保留高级入口。

验收：过期/并发/重放/错误owner/tenant、密码轮换、退出登录、PAT撤销、同token丢响应恢复；profile/scopes升级不扩已发码或旧Key，helper比对授权fingerprint/账户再标连接；发码丢响应原pending可撤销，无码回显/无限新增；机器身份不能新建码；没有OS安全存储停止；服务不返回完整Key；文档/日志/URL无秘密；撤销不丢已接受任务；旧教程不作为主流程。

批次6与1–3可独立并行，但必须共用统一权限/契约；不能把尚未存在的创作端点写进已上线Skill。

## 批次7：集中本地验收与用户走查

用设计中的5个真实案例走完整网页+Agent流程；合并身份/持久写入/任务/额度/未知保护/连接竞争关键检查，构建前端；核对每项feature状态为已实现/离线验收/待真实模型/待发布。保留用户媒体和既有本地预览数据，不靠清库让测试通过。

交付：新本地预览URL、验收报告、API/Skill、明确残留问题；用户确认上线前不sync发布快照或push生产。若批次后还有未满足场景，明确写出，不把设计条目算实现完成。

## 实施所有权与防并发修改

| 工作包 | 主要文件/边界 | 依赖 |
|---|---|---|
| 集成与Admission/投影保护 | `h3-studio/studio_platform/api.py`及抽出的应用服务；统一API schema、公开资料 | 原生数据契约 |
| 创作数据与恢复 | 新quick_chat service/models/routes/tests；不独立猜另一套DTO | 会话→revision→submission身份 |
| 一次码与客户端helper | 新agent_connect service/helper/tests；Auth最小必要扩充scope | 账户/PAT安全契约 |
| 正式聊天UI | `studio-app/src`新workspace/controller/materials/controls/agent组件；保留旧Freestyle | 统一schema/API与真实状态 |

共享文件由集成负责人修改；各包先报契约/需钩子，再实施。未启用草稿不是产品功能：前期新增 `src/quick-chat-model.js` 和 `studio_platform/agent_connect.py` 仍未接运行入口，需按新设计审查后决定复用，不能据文件存在宣称完成。
