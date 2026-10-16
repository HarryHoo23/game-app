# Phase 0 — 投篮手感 baseline + diagnosis

日期：2026-10-16（Australia/Melbourne）。**仅完成基线与诊断；未实施 Phase 1–22，未修改任何游戏源码、配置或素材。**

基线：`HarryHoo23/game-app`，分支 `feat/basketball-mvp`，提交 `3e27283abe6529f45fe982b4ed1ecc7692948fbb`。采集前工作区干净。当前篮球 PNG 保留。

## 结论

主要问题是**时间编排和碰撞表达不一致**：可视顶点非常晚；进网、篮网形变、音效/镜头/文字分散在不同时刻；有些“撞圈”只有音效而没有实际反弹；结果之后还固定等待约 950ms。继续堆效果或先改几个常量，都不足以解决这些问题。

### 1. 飞行为何人工：完整路径的顶点比需求假设更晚

`ShotTrajectory.ts:85` 确实用了 `4*t*(1-t)`，但这只是抛物线项。完整路径还叠加了起点到终点的线性上移，再经过 `perspective.ts:40` 的显示映射。

在默认第一关、理想输入 `(0,-146)` 下，对当前函数采样 10,001 个点得到：

| 指标 | 当前基线 |
|---|---:|
| 主飞行时长 | 900ms |
| 逻辑坐标最高点 | t = 0.7638，约 687ms |
| **屏幕显示最高点** | **t = 0.8756，约 788ms** |
| 最高点到主飞行终点 | 仅约 112ms |
| 主飞行终点的屏幕 y | 234.62 |
| 屏幕最高点 y | 220.11 |

因此不能把问题简单描述成“目前在 50% 到顶”。当前更像长时间向篮板滑行、最后略微下落，随后又切换到单独的穿网阶段。未来重建曲线时需要同时看采样函数与显示投影，不能只替换抛物线项或减少总时长。

另一个需要保留的事实：**缩放已经使用 smoothstep，而非匀速线性缩小**。理想球直径从 126.72px 变到 53.22px（42%）；t=0.1 仍为 124.66px，t=0.5 为 89.97px，t=0.8 为 60.87px。这部分已有合理基础，不应因需求中的概括而重新做一遍。背旋也已是连续约两圈。

### 2. 进球为何弱：奖励与入网相隔约 283ms

以下为 BEFORE 实测，时间从松手开始；浏览器帧采样有约一帧误差，不是性能 benchmark。

| 事件 | 理想 PERFECT +4 | 干净 SWISH +3 |
|---|---:|---:|
| 到达主飞行终点 | 898ms | 916ms |
| 球进入网 / 触发篮网动画 | 981ms | 965ms |
| 出口确认 / 结算 | 1265ms | 1249ms |
| 音效适配器调用 | 1267ms | 1252ms |
| 下一球可操作 | 2199ms | 2200ms |

`GameScene` 在 CENTER 触发 `playNetSwish`，但到 EXIT 才 `resolve`；`Feedback.basket` 同步启动文字、声音、镜头和粒子。因此这些奖励在入网后约 **283ms** 才一起出现，像后补的结算反馈，不像球造成的一次事件。

当前网动画也有错拍：

- 配置延迟 30ms、拉伸 85ms；实际理想球帧采样中，明显形变约在触发后 67ms 开始，约 150ms 达到峰值 1.24。
- 约 217ms 恢复原始长宽，而球约 284ms 才到 EXIT；网仍摆动到约 400ms，但**主要拉伸已先于球退出消失**。
- PERFECT 与 SWISH 都使用相同 strong 分支（1.24 倍拉伸），区分主要在声音分支、粒子数量和小幅镜头变化。
- 镜头 zoom：SWISH 1.004，PERFECT 1.008；在 400px 宽画面上总尺寸变化仅约 1.6px / 3.2px。
- PERFECT 标题当前 27px，SWISH 32px；并没有更强的标题尺度。

**已有正确部分应保留：**四层篮筐、前圈遮挡、网的 top-center 原点、连续穿网、EXIT 后计分均存在；截图也能看到前圈遮住球、球在网内。问题不是重新造 HoopRenderer，而是强化它与球的因果和时序。

### 3. 投失为何弱：类别不等于碰撞响应

真实鼠标输入录到了以下结果：

| 输入（相对拖动） | 候选分类 | 运行时实际接触/声音 |
|---|---|---|
| `(0,-125)` | frontRim MISS | 调用 rim 反馈，但球继续向下 |
| `(0,-230)` | backRim MISS | 同样调用 rim 反馈，球继续向下 |
| `(80,-146)` | airball MISS | 约 18ms 后残余 Matter 阶段确实碰到篮板侧边，调用 backboard |

`GameScene.ts:174–178` 在投失时把 frontRim / backRim 合并为 `impact('rim')`，并把原轨迹末端速度直接交给 Matter。没有按前圈/后圈施加不同反弹，也没有保留这个区分给反馈系统。

中心 x=200 的两个 rim miss 样本，实际 Matter 篮圈碰撞体却在 x=148/252，球物理半径仅 14；这两个样本并不会因此撞到侧边圆形碰撞体。轨迹连续向下，声音却说撞圈。两例 handoff 的 y 速度分别约 6.26 和 6.11，之后均继续向下加速。

此外，投失结算后 `BallAnimator.rebound` 立刻使用 BELOW_HOOP 的前景深度，不按球是否仍在篮圈附近判断，所以球可能在视觉上越过前圈。这一问题在成功穿网测试里不会被发现。

篮板样本也暴露了两套结果口径：域候选先判 airball、先结算 MISS，之后 Matter 才发生实际 backboard 接触。录像是真实输入和真实运行时篮板接触，**不是伪造 backboard 分类或注入特殊轨迹**。后续应该统一结果/接触时间线，而不是把所有投失都加同一声响。

声音代码目前有 rim / backboard 的不同频率，但都是较简单的正弦包络；没有 release 声音。这里只确认代码与调用时间，未据无声视频断言实际听感。

### 4. 空档在哪里

`physics.resetDelay = 950`；`GameScene` 无论进或失，都在结算后等待这个固定值。

| 样本 | 松手→结算 | 结算→下一球可操作 | 松手→下一球可操作 |
|---|---:|---:|---:|
| PERFECT | 1265ms | 934ms | 2199ms |
| SWISH | 1249ms | 951ms | 2200ms |
| 前圈 MISS | 933ms | 932ms | 1865ms |
| 后圈 MISS | 883ms | 934ms | 1816ms |
| 侧边篮板 MISS | 882ms | 951ms | 1833ms |

三个连续球，均在 ready 后立即开始下一次拖动：每个球从松手到 ready 仍约 2.19–2.20 秒。这是固定节奏门槛，不是玩家思考时间。真实拖动本身的时间另外计算。

这一空档不由网动画是否结束决定：网摆动约在入网后 400ms 已结束，而下一球要等到约 2200ms 才可用。应在以后区分“结果需要被看清的展示时间”和固定旧重置时间。

### 5. 松手与静态感：已有内容和缺口

- 已有蓄力压缩：最大 `aimSquash=0.045`，理想力量下约 3.9%；释放拉伸幅度 7.5%，总窗口 100ms。
- 轨迹在松手后立即推进，没有发现人为 release 等待；不能把“感觉慢”直接归因于输入延迟。
- 释放没有对应音效，飞行没有速度残影；静态 PNG、简单形变与不合理的屏幕顶点时机共同削弱了储能/释放感。
- idle 固定摆放；不建议在核心时间线未处理前先加漂浮动画。
- 现有夜景不完全静止，已有缓慢灯光 glow tween；不需要把环境当作本轮优先问题。

## 后续应改哪些现有系统（本轮未执行）

| 优先级 | 现有系统 | 下一阶段应解决的问题 |
|---|---|---|
| 1 | ShotTrajectory / shotFeel + perspective | 显式、可配置的可视顶点与升降节奏；继续保持确定性、预览一致和连续末端速度 |
| 2 | HoopPass / HoopRenderer / hoopLayout | 入网速度、穿网展示窗口与网的拉伸/回弹时序一致；保留四层遮挡和 EXIT 域计分 |
| 3 | GameScene 的事件编排 + Feedback / AudioService / ScoreFeedback | 入网声、镜头、粒子、文字形成一次事件；视觉提前不应提前计分 |
| 4 | 现有投失 handoff / BallAnimator | 让 front/back rim、backboard、airball 有对应可见接触与方向变化；修正近圈投失的深度 |
| 5 | physics.resetDelay / 当前重置编排 | 区分进球/投失展示窗口，减少无需观看的等待；保持上一球结束前禁止新球 |

GameScene 继续只做编排，不创建重复 trajectory/renderer/feedback 系统。设备、关卡、经济、菜单、云服务不进入这轮改造。

## 最值得后续手动试的 5 组现有参数

**这里只记录当前值；没有修改，也不是已经确定的新值。**

1. `shotFeel.durationMs = 900`（与可视顶点一起调；当前没有直接 apex 配置）。
2. `hoopLayout.netMotion.delayMs = 30`（同时观察真实帧延迟、115ms 名义拉伸峰值与实测150ms峰值的差异）。
3. `hoopLayout.netMotion.stretchY = 1.24`（PERFECT/SWISH 共用；normal 的 1.17 仍硬编码在 renderer）。
4. `Feedback.basket` 的 zoom：1.004 / 1.008（目前硬编码，应以后集中）。
5. `physics.resetDelay = 950`（目前进/失共用）。

## 验证与证据

已逐项读取需求列出的 14 个源码文件，README 的 controlled shot / layered hoop / perspective / browser verification 段落；另外追踪 input、Matter handoff、AudioService、theme.motion.score 以确认调用链。

| 命令 | 结果 |
|---|---|
| `npm test` | 5 suites / 64 tests passed |
| `npm run build` | passed；保留已有 Phaser >500kB chunk 提示 |
| `npm run test:shot-feel` | passed |
| `node scripts/layered-hoop-check.mjs` | passed |
| `node scripts/perspective-check.mjs` | passed |
| `node scripts/visual-check.mjs` | passed |
| `node scripts/baseline-shot-check.mjs` | 6 组录像、8 次真实拖动；无 page errors |

所有命令均执行，没有静默跳过过时命令。现有检查验证了合同与回归，却没有验证“屏幕 apex 是否合理”“声音是否和进网同步”或“投失是否真的反弹”，因此通过测试不代表手感已达标。

BEFORE 录像（主视口 400×712）：

- [理想 PERFECT](recordings/01-ideal-perfect.webm)
- [干净 SWISH](recordings/02-clean-swish.webm)
- [前圈投失](recordings/03-front-rim-miss.webm)
- [后圈投失](recordings/04-back-rim-miss.webm)
- [真实侧边篮板接触投失](recordings/05-backboard-miss.webm)
- [连续三球](recordings/06-three-consecutive.webm)

原始数据：[summary.json](summary.json)，逐帧与事件记录在 `traces/`，命令输出在 `logs/`。截图包含前圈遮挡、网内球、各结果和 320×568 / 430×820 小屏构图。

限制：Chrome headless 手机比例，不是真机；WebM 只含画面，**不含音轨**。音效开关通过现有 UI 打开，日志记录 AudioService 调用时点，不能当作扬声器实际发声延迟或主观音质判断。wrapper 只记录并原样调用既有方法，postupdate 仅读取状态；仍有录屏/采样开销。主飞行时长来自逻辑时钟，其余表格是浏览器墙钟近似值，不把一帧级差异视为回归。

本轮新增内容仅为：本报告、`scripts/baseline-shot-check.mjs` 和本目录基线证据。**没有 AFTER，也不声称完成手感改造。** 下一步建议先做 Phase 1 的曲线/可视顶点设计，待用户选择后再实施。
