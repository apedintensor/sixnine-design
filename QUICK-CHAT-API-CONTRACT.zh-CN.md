# 快速创作统一API与数据契约 v1（设计）

日期：2026-10-05，Australia/Sydney。配套整体设计：`QUICK-CHAT-PRODUCT-SYSTEM-DESIGN.zh-CN.md`。本文件描述**新增/改造后的目标契约**，不是现有端点清单或已发布OpenAPI；实施时必须由同一schema生成服务校验、公开文档和前端类型，不能分别手写三套不同字段。

**本地实现补充（2026-10-05）**：原生端点与认可mock页面现已完成本地集成，尚未发布。下面保留原设计依据；实际字段、恢复命令及验收差异以 `../h3-studio/QUICK-CHAT-INTEGRATION.zh-CN.md`、`../h3-studio/skills/sixnine-yingxu/references/quick-chat.md` 和当前本地 `/v1/quick-chat/schema` 为准。HTTP主体目前由共享服务严格校验，OpenAPI的dict主体不是完整字段schema；不能声称已由统一IDL自动生成前后端类型。用户需先确认本地体验，未进行线上LLM/GPU或生产PostgreSQL验收。

## 1. 跨网页与Agent的一致规则

- 同源 `/v1/quick-chat`；网页沿用HttpOnly session，Agent用既有Bearer PAT。owner/tenant仅来自身份，不接受请求里的owner。权限授权与业务幂等身份分离。
- 写命令使用 `Idempotency-Key`（逻辑动作固定值）与规范化内容hash；同key异内容409。保存/提交成功但响应丢失，应使用原key/body重放，不能生成新key重做。
- 会话修改带 `expected_version`；创建revision带 `expected_card_version`；预检/确认引用不可变 `revision_id`/hash。幂等恢复在版本检查之前。
- Session与Card返回版本、更新时间与web_url；链接只有定位作用，不授予权限。提交返回submission/items/job链接，不要求Agent先操作故事/章节。
- GET绝不创建运行/卡/任务。分页用服务端不透明cursor与稳定seq，所有列表有明确limit/has_more/next_cursor；不得靠分别取turn/card数组猜顺序。
- structured error `{code, message, retryable, recovery_url?, current_version?}`，隐藏供应商凭据/提示正文/内部预算与机器标识。HTTP 409是冲突或未知保护，不自动重投。
- 外部模型输出、项目说明、素材元信息均是数据，不可变成授权、路由或基础设施指令。

## 2. 创作API

下表新增端点为设计；现有 `/v1/assets`、job内容下载等按第5节复用。

| 方法与路径 | 输入/输出 | 权限与语义 |
|---|---|---|
| GET `/v1/quick-chat/schema` | version、各准确模型text/image/video/audio的implemented/verified/enabled、payload/选段限制、控制分组、错误/状态枚举 | 认证后可读；静态契约不冒充容量或媒体理解实测 |
| GET `/v1/quick-chat/sessions` | `limit`1–50、cursor；summary列表 | 本owner可访问会话，稳定排序，无正文/材料泄漏 |
| POST `/v1/quick-chat/sessions` | 可选title，model_id；返回session | projects:create/read/write，创建隐藏素材/执行容器，不租GPU |
| GET `/v1/quick-chat/sessions/{id}` | session快照、latest_seq、timeline_url | projects:read，不加载无限历史 |
| PATCH `/v1/quick-chat/sessions/{id}` | expected_version、可选title/model_id/next_settings | projects:write/read；只改下一轮，不改旧turn/card；input_refs为只读派生值 |
| POST `/.../{id}/assets` | multipart文件、稳定client_asset_id | 原生会话上传薄adapter，服务器解析隐藏容器，Agent不必填写旧client_project_id；沿用AssetService原收据/解码/配额 |
| GET `/.../{id}/materials` | 分页catalog，包括未参与binding | 同owner/session；返回binding_id/version、已验证素材元信息与参与状态 |
| PUT `/.../{id}/materials` | expected_version、完整bindings列表 | 原子下一轮材料选择；enabled=false保留catalog；上传ready后明确绑定，输入投影只由本列表派生 |
| GET `/.../{id}/timeline` | cursor、limit1–50、方向；events | 创作部分projects:read；执行详情另要求jobs:read，不能通过timeline越权 |
| POST `/.../{id}/turns` | expected_version、text、model_id、assistant_mode默认assist | assist由语义选择讨论/提案；discuss仅讨论；none只存文字。前两者须projects:read/write+assistant:run；none不需文本调用scope；冻结当前材料/参数，无视频任务 |
| GET `/.../{id}/turns/{turn_id}` | 原输入、实际上下文来源、assistant_run状态/错误、回复与card链接 | 正式回复保留准确model_id，目录成功≠生成成功 |
| POST `/.../{id}/turns/{turn_id}/acknowledge-unknown` | 明确承认旧调用结果未知 | 不重发旧调用，仅解除阻止新的明确讨论；记录审计 |
| POST `/.../{id}/cards` | title、完整prompt、recipe_id、controls、inputs、copies、可选source/turn_id | 用户/Agent直接创建与助手相同的卡；不运行模型或视频 |
| GET `/.../{id}/cards/{card_id}` | head、各revision summary、来源 | 旧快照始终能找回 |
| POST `/.../{id}/cards/{card_id}/revisions` | expected_card_version、完整快照、source_revision_id | 新不可变revision；已确认版本不可覆盖 |
| GET `/.../{id}/revisions/{revision_id}` | 完整快照、input_hash、各份seed与来源 | UI与Agent看到同一内容 |
| POST `/.../{id}/revisions/{revision_id}/preflights` | capabilities_version、revision_hash；可选item_ids、retry_of_execution_id | 首次覆盖各份；retry/resume明确只覆盖指定失败/未准入份，报价不重复包含成功份；可CPU裁片，不租GPU |
| GET `/.../{id}/preflights/{preflight_id}` | 原检查与当前stale原因 | 用于丢响应恢复/确认前检查，不隐式重新预检 |
| POST `/.../{id}/revisions/{revision_id}/submissions` | preflight_id、revision_hash、confirmed=true | 唯一确认边界；业务唯一键是owner+revision，与网页/Key无关 |
| GET `/.../{id}/submissions/{submission_id}` | items各自状态、真实阶段、安全原因、artifacts、last_updated | jobs:read；输出URL有账户鉴权，不给公开裸桶地址 |
| POST `/.../{id}/submissions/{submission_id}/cancel` | 可选item_ids；明确取消请求 | jobs:write；不等于立即停止或免费 |
| POST `/.../{id}/submissions/{submission_id}/resume-admission` | item_ids、fresh_preflight_id、confirmed=true | 仅安全未准入/未执行项，证明无上游与lease；恢复原item和已有planned job，不改已成功/运行/unknown项 |
| POST `/.../{id}/submissions/{submission_id}/items/{item_id}/retry` | retry_of_execution_id、fresh_preflight_id、confirmed=true | 只处理明确已停止的失败项；成功/unknown不允许此操作 |
| POST `/.../{id}/result-imports` | source_artifact_id、用途、可选source_range | 授权同owner来源，CPU核验/入库，返回可恢复import与asset_id；不租GPU |
| GET `/.../{id}/result-imports/{import_id}` | 原导入状态、错误、asset_id、lineage | 未ready不得加成模型输入；未知存储写入对账原收据 |

`/.../{id}` 的完整前缀是 `/v1/quick-chat/sessions/{id}`。这些端点不改变旧API含义；新隐藏执行容器的旧写操作须拒绝绕过。

## 3. 统一输入与快照

直接沿用现有已校验的H3输入语言；材料库的参与标记和UI名称可额外保存在MaterialBinding，但快照不把浏览器Blob URL、任意外部URL、文件路径当收据。

```json
{
  "recipe_id": "h3-base-ref2va-v1",
  "prompt": "完整且可独立执行的画面、动作、镜头与声音描述",
  "copies": 2,
  "controls": {
    "duration": 5,
    "resolution": "768P",
    "aspect_ratio": "16:9",
    "seed": "18446744073709551614",
    "steps": 50,
    "generate_audio": true
  },
  "inputs": {
    "first_frame": null,
    "last_frame": null,
    "images": [{"asset_id": "上传收据ID", "purpose": "identity"}],
    "videos": [{"asset_id": "上传收据ID", "purpose": "motion", "source_range": {"start": 2, "end": 7}, "include_audio": false}],
    "audios": [],
    "guides": []
  }
}
```

精确input语法来自 `generation_draft.input_entries`：首尾各 `{asset_id}`/null；列表条目asset_id/purpose/source_range；guide使用media_id/time_seconds/use_audio/source_range。purpose枚举与类型不能跨用。样例是语法示意，不代表部署池支持这组数量/尺寸/参数。

`next_settings={recipe_id,controls,copies}` 是会话下一轮设置。MaterialBinding格式为 `{binding_id,version,asset_id,kind,slot,purpose,enabled,source_range?,include_audio?,time_seconds?,use_audio?}`，kind来自已验证收据，不接受客户端标签替代；slot为first_frame/last_frame/images/videos/audios/guides。材料catalog包括不参与项，input_refs是启用binding按现有H3语法派生的只读结果；card.inputs是保存当时这个结果，不是另一份可编辑会话真值。卡片显式输入必须先通过该会话合法binding或同一原子命令新增绑定；不能直接借其他会话ID引用。

CardRevision只保存请求语义及requested_input_hash：原素材收据/已知SHA、选段和显式参数。Preflight另保存resolved_execution_hash：派生收据、有效默认参数、准确模型、schema/policy身份；投影source_snapshot另校验。后续CPU裁片/默认值解析不能补写revision，也不能复用同一hash标识三种结构。

seed为uint64十进制字符串或null，不经JavaScript Number；保存revision时分配每份稳定独立seed。显式seed按第n份mod2^64派生，null由服务器生成后持久；预检、刷新、重试不重新随机。更换seed必须新revision。

copies首版1–4是应用限制，底层是多个独立任务。提交之前显示各份与合计运营预留、非最终费用；部分准入失败保留具体原因与已接受项，不把已接受任务撤销或重复创建来“回滚批次”。

单项重试业务unique为 `(tenant,owner,item_id,retry_of_execution_id)`；事务锁item并CAS current_execution，即使不同actor/key也恢复同execution。未准入/未执行planned恢复属于resume-admission，复用原submission/item/job；明确失败且已停止才建立新execution。对成功项不建新plan，对unknown不重试，状态与账务不伪造归零。

Timeline仅对创作命令分配稳定seq。history用before_cursor向后，增量用after_cursor向前，游标绑定owner/session/排序边界；活跃submission另GET读取当前job/artifacts，即使seq不变也更新。服务端批量解析状态，GET不追加伪事件；未来若接outbox，source_event_id唯一+持久checkpoint是前置条件。

## 4. 助手契约

准确ID：gemini-3.8-flash / gemma-4-31b-it；模型出错保留所选模型，不降级。模型返回的目标结构：

```json
{
  "reply": "给用户的讨论或本轮修改说明",
  "intent": "discuss",
  "proposed_card": null
}
```

intent=propose时，proposed_card只能包含title、完整prompt和**允许的**参数/已授权材料引用建议。服务端以本轮持久输入快照为事实，模型不能添加未上传收据、把结果自动设为参考或暗中更换生成方式。建议有冲突则显示供用户处理，不悄悄丢材料。

AssistantRun保存call_id、输入hash、选定model、开始/完成时间、provider返回usage与可披露错误；原始HTTP凭据/完整环境不落日志。必须在远端调用前持久状态并消费一次执行授权，进程重启后running→unknown而不是再次POST。用户可承认unknown并明确开新turn；该动作不称为免费重试。

AssistantRun同时冻结 `media_input_manifest=[{binding_id,asset_id,sha256,source_range,input_type,sent,reason}]`；sent仅对确实放入上游payload的授权媒体为true，不能因已上传到我们服务就设true。manifest不给公共裸存储URL、秘密或媒体正文。schema与每次manifest都要明确逐模型能力，Gemma不自动继承Gemini的媒体支持。

`assistant:run` 是拟新增的独立能力范围，用于可能消费文本额度的调用；现有PAT不会自动获得这个scope。无此权限仍可保存文字或直接创建卡片。新一次码默认广泛创作时在界面明确包含它；生产启用还须配置文本调用开关、并发/上下文/usage限制和供应商运行时凭据，不能依赖GPU预算代替文本费用控制。

当前适配text-only；媒体理解不是可选补丁，是完整mock体验的验收门槛。未验证时只允许清楚标记的手工/外部Agent卡或文本讨论，不能验收“助手已看过图片/动作视频”。内部chat_model_lab的内存历史不进入本契约。

## 5. 已存在的能力如何接入

| 已确认端点/内部服务 | 复用方式 | 不可直接当作新业务 |
|---|---|---|
| `/api/auth/config/login/me/logout`、Auth/PAT | 原身份与账户切换保护 | 新连接授权另加固定事务，不另建账户体系 |
| POST/GET `/v1/assets`、asset content/resume/derivatives | 新API/网页使用隐藏容器归属；同收据恢复 | 原上传成功不代表H3或助手理解已通过 |
| `/v1/capabilities`、compile_request/ExecutionPolicies | 同一模型校验/公开范围/费用与容量 | 不让前端复制mock limits当当前池上限 |
| plan_response、Repo计划/预算/queue | 抽应用服务接不可变revision投影 | 旧source_snapshot/actor_id不能成为新产品唯一性 |
| `/v1/jobs/{id}`、cancel、artifacts/content | 底层状态/产物可以保留原身份 | 新timeline/item必须关联job，不抓全账户job拼猜会话 |
| BatchService | 复用持久item/部分成功原语或改为新submission适配 | 旧actor namespace不保证不同Agent同卡不双投 |
| artifact.adopt | 兼容旧故事候选管理 | 不生成可作为H3输入的asset，不能冒充result import |
| `/for-agents`、guide.json、Skill、OpenAPI | 同网站发现与下载，更新内容 | 旧“自己配内部Registry”的公众教程不是新主流程 |

## 6. 连接授权API

| 方法/路径（新增设计） | 字段与作用 |
|---|---|
| POST `/v1/account/agent-connections` | session-only；name/明确授权profile，持久快照profile_id/version/scopes/all_projects/project_ids/owner/tenant/PAT期限；返回一次code、expires_at、authorization_fingerprint与公开说明 |
| GET `/v1/account/agent-connections` | owner-only列表；pending/connected/expired/revoked、public PAT元信息，不返回code/Key |
| GET `/v1/account/agent-connections/{id}` | 网页连接状态；不能凭ID恢复code |
| DELETE `/v1/account/agent-connections/{id}` | 撤销未兑换码或已有PAT；保留审计与任务 |
| POST `/v1/agent-connect/exchange` | 唯一匿名兑换路径；code/client_challenge/token_hash/key_prefix/expected_authorization_fingerprint；返回连接状态、public_key元信息与固定授权快照，不返回正式Key |
| 同exchange恢复 | 增加recovery_verifier，必须对应原challenge/同token_hash；短窗口只恢复同一结果 |

建议初始code TTL300秒、恢复窗口300秒、PAT90天，是应用策略，可运营变更，不能误称供应商限制。源地址需按部署可信代理链规范化；不信任任意X-Forwarded-For。错误不反射code/verifier/hash或账户，限流同时覆盖非法码和有效码恢复。

码授权使用发码时快照，禁止兑换时读取可变“全部scopes”集合；旧码/旧PAT不自动获得assistant:run。helper核对返回origin/owner/tenant/profile/version/fingerprint才激活本地记录；fingerprint只是匹配断言，兑换方不能借它提供不同owner/scopes。发码响应丢失时只查询原pending并显式撤销重建；服务不重新回显已丢失码，也不能双击无限新增pending。先持久发码操作标识与元信息，秘密码仅单次响应。

公开Skill/helper应先检查TLS同源和OS安全存储，生成并保存本地PAT/verifier，再兑换hash；网络未知保留同材料。代码不走URL/CLI秘密参数，API header/body不写终端/日志。凭码不能调其他创作API、继续签发Key或提高权限。

## 7. 错误与恢复标准

| code | 处理 |
|---|---|
| version_conflict | 保存本地草稿，读新版后明确合并/另存 |
| idempotency_conflict | 原key不能换body，新的明确动作才用新key |
| preflight_stale / execution_policy_changed | 保留卡片，明确重新预检；不自动确认提交 |
| quick_chat_managed_resource | 使用新会话/卡API，不改执行投影 |
| submission_unknown / upstream_stop_unconfirmed | 原任务对账；不重投、不另租替代实例 |
| assistant_disabled / assistant_model_unverified | 明确当前未验收；允许直接写卡，不伪造回复 |
| assistant_call_unknown | 保留原turn；承认未知后可明确新turn，不自动调用 |
| reference_not_ready / result_import_unknown | 恢复原素材处理收据，不以未验证内容生成 |
| insufficient_scope / cross_account_reference | 拒绝且不泄露资源，重新授权不等于扩大已有码权限 |
| connection_expired / connection_consumed / recovery_rejected | 恢复同一连接或明确新授权，不创建多PAT |

上线前验收必须验证跨调用者唯一提交、数据库竞争、进程中断恢复与撤销；只有happy path UI点击通过不足以交付。
