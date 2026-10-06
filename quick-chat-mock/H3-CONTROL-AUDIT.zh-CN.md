# H3 控制覆盖核对 · 2026-10-05 Australia/Sydney

范围：对照 h3-studio/comfy_workflow.py、studio_platform/capabilities.py、studio_platform/qualification_profiles.py、research/nodes_minimax_h3.py 和 CONTROLS.zh-CN.md，以及当前 quick-chat-mock。只读审查；未联网查询生产能力、未调用模型/GPU。旧控制文档里的租赁状态不能作为当前状态。

## 结论
当前 mock 是布局草图，不是完整控制界面。有遗漏，也有无后端映射的错误控件。下一轮按真实 schema 组织，不能凭通用视频生成印象加表单。

| 范围 | 实际字段与规则 | Mock 差距 / 下一步 |
|---|---|---|
| 工作流 | mode=fl/ref；fl 可纯文本或首尾帧；ref 使用普通多模态参考 | 保留简洁方式选择，明确实际映射 |
| 输出规格 | duration 4–15；resolution 480P/576P/768P/custom；aspect_ratio 21:9、16:9、4:3、1:1、3:4、9:16；width/height | 移除无映射720p/1080p，补全部画幅、自定义尺寸与最终采样规格 |
| 自定义尺寸 | 宽高256–1536、32倍数，面积≤1344×768，比值0.4–2.5 | 需要联动约束和错误说明 |
| 输入素材 | images/videos/audios、first_frame/last_frame；video_audio 每视频独立开关 | 缺视频原声开关、片段选择、输入计数及冲突说明 |
| 素材范围 | 构建器上限9图/3视频/3音频、普通参考合计12；片段2–15秒，累计视频/累计音频各15秒 | 不可把这些上限当作当前执行池可接受上限；需叠加 execution_support |
| 参考细节 | ref_image_size=match/max | 缺失；区分细节与计算成本，非参考强度 |
| 时间锚点 | guides数组≤8，media_id/time_seconds/use_audio；实际24fps帧位置，整段需落在输出内 | 文本框无效，改成素材+位置+片段/原声的结构化编辑 |
| 种子与抽卡 | 完整uint64十进制字符串；空值服务器分配。抽卡为应用层多个任务 | mock用Number会丢精度；每份种子/输入快照应可追溯 |
| 采样 | steps 1–100、sampler_name、scheduler、denoise .01–1 | 缺采样器、日程和denoise；不能把denoise称作参考强度 |
| 音画日程 | shift_video/shift_audio .01–100，原生默认12/3，留空沿用 | 缺失，实验项，需解释 |
| 视频解码 | video_decode normal/tiled；video_tile_size/video_overlap/video_temporal_size/video_temporal_overlap | 全缺，适合运行设置折叠区，默认跟随执行池 |
| 编码器 | encoder_device default/cpu | 全缺，勿要求小白处理显存预设 |
| 音频解码 | audio_decode仅normal；audio_tile_size/audio_overlap标available=false | 不可把音频分块作为可用选项 |
| 导出 | generate_audio、export_crf 0–51；固定24fps、H264、音频FLAC | 缺CRF；关闭声音指跳过音频解码/输出，不等于模型不生成音频latent |
| 预检 | capabilities_version、真实尺寸/帧数/导出时长、execution_support和费用/容量原因 | mock还未表达完整状态；不能把准备好与可执行混为一谈 |

## 错误控件
- guidance/negative：当前Base图使用BasicGuider，不接负面条件或CFG强度。删除独立有效控件，不能假装已实现。
- 720p/1080p：当前本地枚举不是这些值；768P在16:9下为1344×768。精确宽高应显示，不能偷换标签。
- anchors自由文本：是描述意图，不是已编码的时间锚点。

## 重要边界纠正
普通inputs中fl与images/videos/audios互斥，ref与first_frame/last_frame互斥。但构建器在两种condition后都可连接MiniMaxH3AddGuide，guides是独立路径，不应从普通输入互斥推导为所有其他素材绝对禁止。当前qualification_profiles本地策略模板却只允许ref配方的图片guide，且有更小输入上限。因此UI须同时区分节点能力、API已封装能力、执行池实际开放范围。此次未读取公网实时策略，不声明新组合能在线运行。

## 原生扩展能力不等于现有API
Comfy官方文档有时间锚点、latent noise mask重绘/延长、Turbo LoRA等；当前构建器未封装mask、extend、Turbo入口。Fun ControlNet需要额外权重/图。不要把新增表单写成已有API能力，也不要据文档自动下载/部署。
来源：https://docs.comfy.org/tutorials/video/minimax/minimax-h3-native （本次读取）

## 下一轮UI组织建议（待继续实现）
1. 输入区：用途、参与状态、片段、视频原声、素材引用标记。
2. 弹窗常用区：方式、真实尺寸/比例、时长、声音、抽卡。
3. 参考与时间：参考细节、结构化锚点。
4. 采样实验区：种子、步数、采样器、日程、denoise、音画shift。
5. 运行与导出：自动执行池预设，解码分块、编码器和CRF。用户不改则安全默认，不静默覆盖显式选择。
6. 暂不支持：说明能力来源和缺少的实现，不给假有效控件。

下一轮必须移除假控件并做字段覆盖表；本次仅完成审查，未将上述差异全部修入mock。
