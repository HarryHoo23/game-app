# AFTER HOURS 3D 无限练习 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付可连续自然上划投 20–30 球、真实穿筐计分、迅速补球的竖屏 3D 无限练习原型，随后停止等待真人试玩。

**Architecture:** React Three Fiber 显示场景，Rapier 独立控制发射后的球。纯函数处理弹道、穿筐判分与失误分类；Zustand 仅发布统计和阶段变化。所有产品文件位于 prototype-3d/，保留现有 Phaser 应用。

**Tech Stack:** React、TypeScript、Vite、Three.js、React Three Fiber、React Three Rapier、Drei、Zustand；Vitest、ESLint、Playwright。兼容版本在任务 1 依据 npm peer dependencies 确认并锁定。

**Spec:** `docs/superpowers/specs/2026-10-19-3d-basketball-practice-design.md`（已获用户批准，执行者先读规格与本计划）。

## Global Constraints

- 分支 `feat/3d-basketball-prototype`，产品目录 `prototype-3d/`；不修改原应用源码、package.json 或锁文件。当前分支已存在，无需重新创建。
- 独立 dev、build、preview、lint、test、test:browser 命令，原型默认端口 5174。
- 首版无限练习；三失误、最佳分数、Game Over、动态网、音效和环境打磨后置。
- 初始配置：重力 `(0,-9.81,0)`，球起点 `(0,1.35,4.2)`，半径 `0.12`，质量 `0.62`；篮圈 `(0,3.05,0)`，内半径 `0.24`，管半径 `0.018`，32 段 capsule；篮板 `(0,3.65,-0.43)`，尺寸 `(1.8,1.05,0.06)`。
- 初始球恢复系数 `0.65`、摩擦 `0.35`、弧顶 `4.1`、固定步长 `1/120 s`；CCD；所有调参集中到 src/config.ts。
- 相机初始 `(0,2.05,6.1)`，看向 `(0,2.1,0)`，竖向视角约 `54°`，DPR 上限 `1.5`；验收 320×568、400×712、430×820 及桌面。
- 发射只设置一次速度；飞行中禁止吸附、位置纠正、脚本轨迹、随机散射与注入计分。
- 确认命中约 350 ms 补球、失误约 150 ms；最长仿真寿命 5 s；最多 3 个动态球；最近 100 球有界日志。
- 原创几何/材质，不导入参考资产；复制参考代码时保留完整 MIT 和来源。50–70% 是真人试玩目标。

## Review Focus

1. 小屏或旋转时手指仍按旧尺寸拖动：取消瞄准，已发射球保持原世界速度（任务 4、6）。
2. 长按、稀疏 pointermove、多指及指针取消：不产生突发大力或额外出手（任务 4、6）。
3. 球擦边后仍可能入篮：不能提前判丢；合法斜向穿网不能被下确认区误拒（任务 2、3）。
4. 切后台或连续点击重开：不追赶后台时间，旧球不得污染新练习（任务 5、6）。
5. WebGL/物理初始化失败或剪贴板不可用：提供可操作提示与日志下载；生产环境没有 DEV 接口（任务 1、5、6）。

## 文件与共享接口

所有下述产品路径相对于 `prototype-3d/`。任务按顺序执行，每步先写有意义的失败测试，再实现并验证；工具配置与纯外观不单独制造实现镜像测试。

- `src/config.ts`：唯一初始调参；`src/domain/types.ts`：`Vec3 = {x:number;y:number;z:number}`、`Sample = {position:Vec3;velocity:Vec3;time:number}`、`Contact = {kind:'rim'|'board'|'floor';time:number;position:Vec3}`。
- `src/domain/launch.ts`：`solveBallistic(origin:Vec3,target:Vec3,apex:number,gravity:number):Vec3`；`mapGesture(gesture:Gesture,config:GameConfig):Launch|null`。`Gesture = {start:{x:number;y:number};end:{x:number;y:number};width:number;height:number;durationMs:number}`；`Launch = {velocity:Vec3;angularVelocity:Vec3;normalized:{dx:number;up:number}}`。
- `src/domain/scoring.ts`：`createBasketState():BasketState`；`advanceBasket(state:BasketState,prev:Sample,next:Sample,grounded:boolean,config:GameConfig):{state:BasketState;made:boolean}`，made 只在首次确认返回 true。
- `src/domain/shot.ts`：`resolveShot(trace:readonly Sample[],contacts:readonly Contact[],made:boolean,config:GameConfig):ShotResult`；`shouldRetire(sample:Sample,contacts:readonly Contact[],age:number,config:GameConfig):boolean`。`ShotResult = 'swish'|'rim-make'|'board-make'|'short'|'long'|'left'|'right'|'rim-miss'|'board-miss'|'miss'`。
- `src/scene/geometry.ts`：`createRimSegments(config:GameConfig):RimSegment[]`，每段给出端点、中心、半长和朝向；视觉与 Rapier 使用同一配置。
- `src/store.ts`：`usePracticeStore`，包含 sessionId、attempts、makes、phase、feedback；动作 `recordLaunch(sessionId,shotId)`、`recordResult(sessionId,shotId,result)`、`restart()`。phase 为 ready/aiming/flying/recovering/paused，每球结果只应用一次。
- `src/debug/sessionLog.ts`：`recordLaunch`、`recordSample`、`recordContact`、`recordResult`、`exportSession():string`，记录带 sessionId/shotId/source；只读浏览器检查入口不得提供设置位置或得分方法。

### Task 1: 独立可见的 3D 场景与真实接触

**Files:** 创建 package.json、锁文件、index.html、Vite/TS/ESLint/Vitest 配置、README.md、src/main.tsx、src/App.tsx、src/config.ts、src/domain/types.ts、src/scene/{Court,Hoop,Ball,CameraRig}.tsx、src/scene/geometry.ts、tests/{geometry,physics}.test.ts、tests/helpers/rapierWorld.ts。

**Interfaces:** 产出 GameConfig、Vec3/Sample/Contact、createRimSegments；导出 `createTestWorld(config:GameConfig)`，使用与浏览器完全相同的几何配置和 Rapier 引擎版本。必要时把适配器使用的 Rapier 包列为同版本 devDependency，不引入另一套物理库。

- [ ] 确认原分支状态和根目录测试基线。查询 npm 的版本/peer dependencies，安装兼容依赖到原型目录并生成独立锁文件；记录版本与运行环境。原应用缺依赖时先用原锁文件安装，避免更新原锁文件。
- [ ] 写失败用例 `hollow_ring_and_board_contacts`：32 段闭合环、中心没有实体；动态球穿中心不碰圈，碰前后侧段及篮板后速度确实改变。精确断言：`segments.length === 32`、球半径 `0.12`、内半径 `0.24`、接触事件包含预期 kind，反弹速度有限。
- [ ] 运行 `npm test -- tests/geometry.test.ts tests/physics.test.ts`，确认因尚未实现世界/几何而失败。
- [ ] 实现共享尺寸、显式碰撞体、球 CCD 与固定步进；用原创球面接缝、静态网和简单灯光显示。App 加入初始化错误边界与重试按钮；不添加装饰场景。
- [ ] 同一命令通过；`npm run build` 与 `npm run lint` 通过；启动 `npm run dev`，人工检查球、板、圈可见且中心中空。先不加用户发射功能。
- [ ] 仅提交本任务原型文件：`feat: add isolated 3D basketball physics scene`。

### Task 2: 正确基准弹道与向下判分

**Files:** 创建 src/domain/{launch,scoring}.ts、tests/{launch,scoring,ballisticPhysics}.test.ts；修改 src/domain/types.ts 和 tests/helpers/rapierWorld.ts。

**Interfaces:** 消费任务 1 的类型、配置与物理测试世界；产出 solveBallistic、createBasketState、advanceBasket。BasketState 记录上方资格、圈面向下穿越及已计分状态，不拥有球的位置。

- [ ] 写失败测试 `descending_ballistic_solution`：将初始速度代入重力方程，在下降时到达 `(0,3.05,0)`，误差小于 `1e-6`，vy 此时为负；非法/非有限参数被明确拒绝。
- [ ] 写失败测试 `ordered_downward_score_once`、`reject_upward_side_floor_and_repeat`、`accept_slanted_lower_exit`：上方→圈面→下确认面产生恰好一次 made；仅向上/仅侧入/落地后/重复采样均不加分；斜向穿网正常计分。单步跨多个平面按穿越时间排序。
- [ ] 运行 `npm test -- tests/launch.test.ts tests/scoring.test.ts`，确认失败；实现弹道公式和扫掠判分。开口考虑球半径，下确认面在球与圈管以下；反向回升撤销未完成圈面穿越资格。
- [ ] 加真实 Rapier 集成测试 `baseline_sphere_physically_scores`：只从正常起点设置一次速度并步进，判分来自实际位置，要求 made 一次、无 rim/board 接触、不穿板。记录离散步进误差，必要时调发射解或集中参数，禁止改飞行位置。
- [ ] `npm test -- tests/launch.test.ts tests/scoring.test.ts tests/ballisticPhysics.test.ts` 全部通过，提交 `feat: add ballistic launch and directional basket scoring`。

### Task 3: 实测失误分类与单球生命周期

**Files:** 创建 src/domain/shot.ts、tests/{shot,shotPhysics}.test.ts；修改 src/domain/types.ts。

**Interfaces:** 消费 Sample/Contact 和共享几何；产出 resolveShot、shouldRetire。trace 是实际轨迹；made 只来自任务 2。复合接触命中以 board-make 优先，完整日志保留所有接触。

- [ ] 写失败用例 `observed_short_long_left_right`：实际下降圈面位置分别在正 Z/负 Z/负 X/正 X，返回 short/long/left/right；若碰撞使轨迹不再可靠，返回接触文案或 miss。`made=true` 且无接触返回 swish。
- [ ] 写失败用例 `rim_rebound_is_not_prematurely_retired` 和 `bounded_retirement`：仍在篮圈附近且有可能反弹入篮的球不终止；落地、远出界或年龄达到 5 s 终止。
- [ ] 运行 `npm test -- tests/shot.test.ts` 确认失败；实现使用实际下降穿越采样的分类、接触优先反馈与保守终止条件。
- [ ] 用真实世界的正常起点/发射速度覆盖前沿、后沿、板接触和合法反弹入篮；只调发射参数寻找场景，不瞬移或伪造接触。断言碰撞前后方向变化、判分一次、反馈与接触一致。
- [ ] `npm test -- tests/shot.test.ts tests/shotPhysics.test.ts` 通过；提交 `feat: classify observed shots and resolve outcomes`。

### Task 4: 宽容上划与可连续操作的发射

**Files:** 创建 src/input/{pointerGesture,useShotInput}.ts、src/scene/PracticeScene.tsx、tests/{gesture,pointerGesture}.test.ts；修改 src/domain/launch.ts、src/config.ts、src/scene/Ball.tsx、src/App.tsx。

**Interfaces:** 消费 mapGesture/Launch 与解算器；指针控制器 `createPointerGesture(config)` 提供 begin/move/end/cancel，end 产出 Gesture|null；hook 绑定实际游戏区域，通过 onLaunch(Launch,Gesture) 发射。

- [ ] 写失败测试 `mapping_is_viewport_and_event_count_independent`：400×712 与 320×568 的同比例手势生成相同速度（容差 `1e-9`）；相同终点、0/5/50 次 move、100/600 ms 时长生成相同速度。
- [ ] 写失败测试 `natural_band_is_continuous_and_forgiving`：20–40% 高度上划保留小幅连续射程变化；微小横偏受压缩，明显横划有明显偏差；明显弱/强手势在真实模拟中会短/长。轻点、向下、零尺寸、非有限输入返回 null。
- [ ] 写失败测试 `cancel_resize_multitouch_does_not_launch`；运行 `npm test -- tests/gesture.test.ts tests/pointerGesture.test.ts` 确认失败。
- [ ] 实现宽容带/横向死区的集中配置与纯映射；宽容带内不要把所有手势量化为同一发射。绑定主指针捕获、真实 release 终点、lost capture/cancel/resize 清理，按钮区域不启动手势。
- [ ] 接入准备球→动态球切换，仅设置一次线速度/后旋。运行上述测试及 `npm test -- tests/ballisticPhysics.test.ts tests/shotPhysics.test.ts`；实屏上划可发射并看到真实碰圈或穿筐。
- [ ] 提交 `feat: add forgiving portrait swipe shooting`。

### Task 5: 无限练习、快速补球与有界日志

**Files:** 创建 src/store.ts、src/ui/{PracticeHud,PauseOverlay}.tsx、src/ui/styles.css、src/debug/sessionLog.ts、tests/{practice,sessionLog}.test.ts；修改 src/scene/PracticeScene.tsx、src/App.tsx、src/config.ts。

**Interfaces:** 消费每球结果与指针发射；产出约定的 store 和日志接口。练习调度以固定步进仿真时间为准，restart 增加 sessionId，所有旧回调携带其原 ID 并被拒绝。

- [ ] 写失败测试 `practice_survives_30_attempts`、`one_result_per_shot`、`old_session_cannot_score`：连续 30 次含多次失误仍可出手，无 Game Over；统计只增加一次；快速重开后旧结果被忽略。
- [ ] 写失败测试 `recovery_and_body_cap`：命中/失误后的 350/150 ms 到点准备新球；活动球不被淘汰，旧球最多令动态总数达到 3，旧球与新球不碰撞。`paused_time_is_not_caught_up`：暂停不推进寿命与补球。
- [ ] 写失败测试 `bounded_log_and_clipboard_fallback`：101 球仅保留最近 100 条，轨迹采样也有上限；导出记录包含实际速度/接触/结果；剪贴板拒绝后可下载 JSON。运行 `npm test -- tests/practice.test.ts tests/sessionLog.test.ts` 确认失败。
- [ ] 实现状态与调度、隐藏暂停/显式恢复、球清理与暂停渲染；HUD 只显示命中/出手和短反馈。DPR 上限、安全区、桌面竖屏宽度上限由配置/CSS 控制。
- [ ] 实现 DEV-only 日志与只读检查接口，提供来源标签，录屏测试标记 automation，人类练习标记 human；生产构建移除入口。日志不提供 setScore/teleport。
- [ ] 上述测试与 `npm run build`、`npm run lint` 通过；提交 `feat: add unlimited practice and shot session logs`。

### Task 6: 浏览器真实输入验收与首次试玩交付

**Files:** 创建 playwright.config.ts、tests/browser/{shooting,lifecycle,production}.spec.ts、tests/browser/helpers.ts、scripts/capture-shots.mjs、docs/verification.md、docs/licenses.md；更新 README.md；录屏/轨迹保存到 prototype-3d/docs/verification/2026-10-19/。

**Interfaces:** 测试只读取 DEV 诊断与通过实际鼠标/触摸操作发射；touch 使用浏览器原生触摸输入通道，禁止 dispatchEvent 伪造成功。录屏由同一输入 helper 驱动，结果读取实际日志。

- [ ] 写浏览器验收：三个手机尺寸和 1280×800 桌面下球/圈/基准弧顶在画面内；鼠标与触摸均能投球；典型上划有实际穿筐命中，明显短/长/横偏有可解释失误。手势端点采用实际球投影位置和区域尺寸计算，不沿用旧游戏固定像素。
- [ ] 覆盖 Review Focus：瞄准 resize 取消、飞行 resize 不改速度、多指/取消无额外出手；30 球与快速重开无球体/监听器增长；隐藏期间不推进，恢复后无大跳步；模拟初始化错误出现重试，剪贴板拒绝可导出。
- [ ] 启动开发服务器，运行 `npm run test:browser`；先保留失败证据，再修复具体问题。观察命中与接触日志调 config.ts，不按预期结果修改得分逻辑。任何产品修改重跑其相关单元测试。
- [ ] 运行 `npm run build`，以 preview 验证相同实际输入可玩、没有 DEV 检查接口；根目录运行 `npm test`、`npm run build`、`npm run lint` 确认旧应用仍可用。
- [ ] 最终运行原型 `npm test`、`npm run lint`、`npm run build`、`npm run test:browser`；保存命令与实际结果。不得把未运行检查标成通过。
- [ ] 捕获竖屏典型命中、空心、前沿失误、后沿失误、篮板接触及连续出手，逐个附发射速度/接触/结果 JSON。确实没有捕获到的案例记录为缺项，不能伪造演示。
- [ ] README 写独立安装/启动/预览命令、config.ts 调参位置、首次 20–30 球试玩方法；许可证记录原创资产、参考版本及实际复制情况。交付报告列版本、变更、检查/录屏、限制；明确未验证实体手机性能与真人命中率。
- [ ] 检查 diff、完成代码审查并修复问题，提交 `test: verify 3D practice and capture playtest evidence`。保持本地可运行后停止，不扩充街机模式或自动部署，等待用户试玩。

## 计划自审与执行交接

规格的隔离、几何、弹道、判分、输入、反馈、补球、暂停、日志、资产及验收均对应上述任务。共享类型和函数签名已统一；Review Focus 五项已分配到具体测试。任务顺序先让球真实飞行，再接输入与补球，不把装饰工作放进关键路径。

建议 Native：由当前会话逐任务实施，最后做一次独立整体审查。六个任务共享几何、采样与生命周期接口，连续实现便于快速验证手感。用户也可选择 Subagent-driven，逐任务独立实现与审查，代价是更多上下文和交接。

状态：实施计划已写并自审，待用户评审并选择执行方式；尚未开始产品实现。
