# Shot implementation checkpoint — 2026-10-17

本轮只实施已批准的屏幕轨迹、穿网时序、反馈编排、投失接触和下一球节奏，以及附件指定的轻量松手音与池化残影。没有修改关卡、设备、经济、菜单、进度、背景动画或美术素材。Phase 0 原始证据完整保留。

**画面判断：比 BEFORE 明显更像一次有上升、下降、入圈和结果的投篮，尤其前圈投失终于会弹开，连续三球的空档也缩短了。但还不是可以宣称已达到商业成品的手感。** 下文同时列出仍可见的弱点。

## 先看录像

用户优先点名的四段：

1. [01-ideal-perfect-after.webm](recordings/01-ideal-perfect-after.webm)
2. [02-clean-swish-after.webm](recordings/02-clean-swish-after.webm)
3. [03-front-rim-miss-after.webm](recordings/03-front-rim-miss-after.webm)
4. [06-three-consecutive-after.webm](recordings/06-three-consecutive-after.webm)

补充：[04-back-rim-miss-after.webm](recordings/04-back-rim-miss-after.webm)、[05-backboard-miss-after.webm](recordings/05-backboard-miss-after.webm)。

均为 400×712 的真实鼠标拖动，沿用 BEFORE 的对应输入。录像含进入球场的准备部分；不是仅截取成功瞬间。WebM 仍不含音轨；声音开关开启，AudioService 调用时点在 JSON 中。不能据此声称测量了真实扬声器延迟或真机主观音质。

## BEFORE / AFTER 时间比较

同一输入、第一关、基础属性。主飞行来自逻辑时钟；事件来自浏览器墙钟，具有约一帧误差。以下为最终录像的实际采样，而非只列设计目标。

| 指标 | BEFORE | AFTER |
|---|---:|---:|
| 理想球屏幕 apex | 87.56% | **44.00%** |
| 理想主飞行 | 900ms | **800ms** |
| 理想球 CENTER | 981ms | **848ms** |
| 理想球 EXIT / resolve | 1265ms | **949ms** |
| 理想 CENTER→EXIT | 284ms | **100ms** |
| 理想声音/镜头 entry feedback 开始 | 1265ms | **849ms** |
| PERFECT resolve→ready | 934ms | **667ms** |
| PERFECT release→ready | 2199ms | **1615ms** |
| SWISH CENTER→EXIT | 283ms | **100ms** |
| SWISH resolve→ready | 951ms | **600ms** |
| SWISH release→ready | 2200ms | **1549ms** |
| 前圈 MISS resolve→ready | 932ms | **450ms** |
| 前圈 MISS release→ready | 1865ms | **1282ms** |
| 后圈 MISS release→ready | 1816ms | **1349ms** |
| 侧边篮板 MISS release→ready | 1833ms | **1248ms** |

精确值见 [comparison.json](comparison.json)、[summary.json](summary.json) 和 `traces/`。纯函数计算的理想 CENTER≈837ms、EXIT≈946ms；与上表墙钟不强行等同。连续三球约为每球 release→ready 1.55–1.62 秒，原先约2.19–2.20秒；另外仍有真实拖动所用时间。

## 实施内容

- **屏幕轨迹先行。** 直接定义可视 apex、升降两段，再反求逻辑坐标及导数，消除透视投影把 apex 推到末尾的问题。预览和飞行继续共用同一采样器，终点、输入误差和旋转连续。保留现有 smoothstep 缩放，126.72px→约53px（42%）。
- **修复数值通过但看不见球的问题。** 可视 apex 增加184px构图下限与40px最小下降距离；第一关最终有约51px主飞行下降。HUD本身未改动。
- **穿网连续加速。** HoopPass 从主飞行的同一位置、速度、旋转和尺度继续；加速度平滑衰减，避免突然跳位或把球直接放到网下。
- **CENTER 与 EXIT 分工。** CENTER 触发声音、镜头和网的拉伸；EXIT 才提交 LevelSession 得分、更新 HUD、弹出分数、发出原有粒子。动画 callback 不计分。
- **网形变跟球走。** top-center 原点保留，强形变保持到 EXIT，再摆动和精确复位。PERFECT 比 SWISH 的拉伸、镜头、标题更强。遮挡使用整个球与实际变形网底的空间关系，避免刚计分就弹到网前面。
- **投失与物理一致。** 前圈和后圈保留不同的2.5D接触类型，在可见接触时修改实际 Matter 速度。前圈球向上/外弹开，后圈向前/下方更强地弹开；不是仅改变图片的动画。
- **篮板接触先于 MISS。** 空投候选若仍可能碰板，等真实接触或离开物理接触区域后才结算。回归输入 `(65,-145)` 曾暴露固定80ms窗口的漏洞，现已改为空间判定；实际碰板与最终 MISS 同一物理步发生。投失展示期内的次级真实碰撞继续反馈，仍不改变计分。
- **节奏分开。** MISS / MAKE / PERFECT 分别使用450 / 600 / 675ms配置，不再使用950ms通用等待。下一球不被旧分数字幕阻塞；尚未结算的上一球仍禁止重入。
- **仅补指定的轻量内容。** 松手即调用42ms干燥轻音；三个复用残影只在有意义的主飞行速度段出现，idle、瞄准、网内、投失与结算阶段隐藏。

## 关键调参

| 配置 | 当前值 |
|---|---|
| `shotFeel.visualApexProgress` | 0.44 |
| `shotFeel.visualApexMinY` / `visualMinDescent` | 184px / 40px |
| `shotFeel.durationMs` / bounds | 800ms / 700–950ms |
| `shotFeel.passMotion.gravity` / `accelerationDecayMs` | 初始 .045px/ms² / 20ms衰减；新增速度渐近 .9px/ms |
| SWISH / PERFECT camera | 1.018 / 1.025，140ms |
| SWISH / PERFECT net stretchY | 1.36 / 1.40 |
| SWISH / PERFECT net squeezeX | .90 / .88 |
| SWISH / PERFECT net downward pull | 6 / 8 display px |
| net pull / release | 65ms拉伸、保持到EXIT，再按80/110/100/90ms四拍摆动 |
| SWISH / PERFECT font | 32px / 37px（+15.6%） |
| score callout | .82→1.06→1，总时长800ms |
| `resultTiming` MISS / MAKE / PERFECT | 450 / 600 / 675ms |
| default centreline front-rim impulse | vx=-3.4、vy=-5.2 Matter px/tick |
| default centreline back-rim impulse | vx=+5.8、vy=+10.5 Matter px/tick |
| pooled trail | .11 / .06 / .025，24ms采样 |

以上冲量横向方向也会参考实际偏移，不是每球随机方向。碰圈仍采用受控2.5D平面响应，不宣称是完整三维环形刚体模拟。

## 验证

- 单元测试 **76/76**，含投影 apex、目标精确、预览一致、确定性、缩放单调、速度连续、传感器顺序、不同实际冲量、遮挡空间判定、不同 cadence。
- TypeScript / Vite build、ESLint、Prettier、`git diff --check` 通过；保留已有 Phaser vendor chunk 大小提示。
- `shot-checkpoint-check.mjs`：EXIT前不加分、结算等待期间不再发球、网内暂停恢复、网精确复位、残影在网/idle隐藏、晚碰板输入最终结果。
- 既有 `test:shot-feel`、layered-hoop、perspective、visual 检查通过；主飞行断言已随800ms更新。
- `npm run test:browser` 通过，覆盖真实触控、暂停/重启/退出、连续整局、末球结算及失败重试等回归；没有修改这些领域的实现。
- 六段 AFTER 录制包含断言：前圈实际vx/vy改变，后圈与前圈不同；篮板接触在MISS前；entry不改分；CENTER→EXIT范围；ready窗口；最终网与残影复位。
- 独立审查发现并修正了晚碰板的固定窗口问题，额外复核 `(65,-145)`、`(65,-130)` 与原 `(80,-146)`；无剩余重要阻塞项。

`source-manifest.json` 保存最终录制所用运行源码SHA-256。`logs/`、`traces/` 和 `comparison.json` 保留验证依据。BEFORE目录未改动。

## 实际画面仍有的弱点

1. 顶点附近仍有一点停留感。曲线在连接点速度连续，但加速度尚不连续；与完整重力弧线相比仍有受控动画感。
2. 顶点上缘与HUD仍有轻微交叠。184px避免了第一版的大面积遮挡，但未重排HUD或改变既有缩放。其他更高篮圈的关卡未在本轮重做构图。
3. 进球后的残余 Matter 落地反弹偏高，有时又回到篮网附近；前圈投失旧球也可能在退场时仍在弹。虽然下一球出现更快，这一段还会暴露原型感。
4. PNG网仍是整体拉伸，不是局部受球牵拉的网格变形；网内球在小屏短时间被密网遮住较多。
5. 录像为桌面Chrome的手机比例；还没有真实iPhone/Android上的触感与音质验收。

**下一项只建议做：投篮结果后的落地/退场响应，重点压住进球后的过高回弹，让新球接入更自然。** 不建议接着加环境动画、粒子种类或菜单。

本检查点到此停止。

## 精确修改文件

运行源码（19个，含3个测试文件）：

```text
src/data/courtPerspective.ts             新增：纯可逆投影；配置值保留
src/data/feedbackFeel.ts                 新增：镜头/文字/轻音/残影配置
src/data/impactFeel.ts                   新增：接触/重置节奏配置
src/data/physics.ts                      移除旧通用resetDelay
src/data/shotFeel.ts
src/domain/shooting/ImpactResponse.ts    新增：接触响应与空间结算门
src/domain/shooting/ShotTrajectory.ts
src/game/effects/ScoreFeedback.ts
src/game/environments/BallAnimator.ts
src/game/hoop/HoopPass.ts
src/game/hoop/HoopRenderer.ts
src/game/hoop/hoopLayout.ts
src/game/presentation/perspective.ts     保留公共导出，纯投影移到data供规划共用
src/game/scenes/GameScene.ts
src/game/systems/feedback.ts
src/services/feedback.ts
src/tests/hoopSensors.test.ts
src/tests/impactResponse.test.ts         新增
src/tests/shotTrajectory.test.ts
```

浏览器验证：`scripts/after-shot-check.mjs`（新增）、`scripts/shot-checkpoint-check.mjs`（新增）、`scripts/shot-feel-check.mjs`、`scripts/layered-hoop-check.mjs`、`scripts/perspective-check.mjs`。另更新 README，新增本目录报告、JSON、日志、截图与六段录像。
