# Lab1 Phase 1：SVG 编辑器（CLI）架构与工程文档

## 架构方案

### 1. 模块划分

本系统按照**关注点分离（Separation of Concerns）**与**稳定依赖原则（SDP）**划分为四个核心模块（对应 `src/` 下的四个子目录），所有类与接口严格遵循**“一类一文件（文件名 = 类名 / 接口名）”**的面向对象规范：

| 模块目录 | 模块名称 | 核心职责 | 包含的主要类 / 接口 |
|---|---|---|---|
| `src/model/` | **领域模型模块（稳定内核）** | 维护 SVG 画布状态、图形组合树结构（Composite）、全局唯一 `id` 索引、多态几何变换（平移、缩放）、属性白名单校验与父子环路不变式检查。**完全独立于 UI 与外部 I/O。** | `SvgDocument`、`Shape`（抽象基类）、`GroupShape`、`RectShape`、`CircleShape`、`EllipseShape`、`LineShape`、`TextShape`、`ShapeFactory` |
| `src/command/` | **命令与历史管理模块** | 将每一次用户请求封装为独立对象（Command），负责向领域模型转发请求、维护增量逆状态，并通过双栈管理 Undo / Redo 及文档 I/O 锁状态。 | `Command`、`UndoableCommand`、`CommandResult`、`CommandExecutor`、各具体命令类（`CreateCommand`、`DeleteCommand`、`MoveCommand`、`ScaleCommand`、`SetCommand`、`GroupCommand`、`UngroupCommand`、`AddToCommand`、`FrontCommand`、`BackCommand`、`InitCommand`、`ReadCommand`、`SaveCommand`、`CanvasCommand`、`TreeCommand`、`ShowCommand`、`HelpCommand`） |
| `src/io/` | **序列化、格式化与持久化模块** | 负责 SVG XML 文本的解析（含缺失 `id` 的自动补全与 warning 生成）、SVG XML 导出序列化、结构树（`tree`）与属性明细（`show`）的文本格式化，以及文件系统读写接口与实现。 | `FileSystemPort`、`NodeFileSystemAdapter`、`SvgParser`、`SvgParseResult`、`SvgSerializer`、`TreeFormatter` |
| `src/cli/` | **命令行交互模块（UI 入口）** | 负责 REPL 交互循环、命令行词法分析（处理 `#` 注释与双引号包裹的含空格参数）、命令名分派（Command Factory）以及统一输出与 `error:` 格式化。 | `CommandTokenizer`、`CommandFactory`、`CliSession`、`CliRepl` |

#### PlantUML 组件与包图

```plantuml
@startuml
skinparam packageStyle rectangle
skinparam componentStyle uml2

package "src/cli (交互入口层)" as cli {
  [CliRepl]
  [CliSession]
  [CommandTokenizer]
  [CommandFactory]
}

package "src/command (命令编排层)" as command {
  interface Command
  interface UndoableCommand
  [CommandExecutor]
  [ConcreteCommands (Create/Move/Group/...)]
}

package "src/io (序列化与外部适配层)" as io {
  interface FileSystemPort
  [NodeFileSystemAdapter]
  [SvgParser]
  [SvgSerializer]
  [TreeFormatter]
}

package "src/model (核心领域层 - 稳定内核)" as model {
  [SvgDocument]
  abstract class Shape
  [GroupShape]
  [LeafShapes (Rect/Circle/Ellipse/Line/Text)]
  [ShapeFactory]
}

cli --> command : 创建并委托执行命令
cli --> io : 注入持久化与解析组件
cli --> model : 持有文档上下文
command --> model : 转发操作到 Receiver (SvgDocument / Shape)
command --> io : 文档/显示命令调用解析、序列化与格式化
io --> model : 构建与遍历图形组合树
@enduml
```

---

### 2. 设计模式的选择与代码落地

#### （1）组合模式（Composite Pattern）—— 统一叶子图形与容器 `<g>`
- **设计动机**：SVG 文档天然是由容器 `<g>` 与基础图形组成的任意深度树形结构，且编辑命令（`move`、`scale`、`set`、`delete`）与展示命令（`tree`、`show`）对容器与叶子一视同仁。
- **角色映射与代码落地**：
  - **`Component`（抽象组件）**：`src/model/Shape.ts`。封装所有图形共有的私有属性（`id`、`parent`、`fill`、`stroke`、`strokeWidth`），声明统一的抽象与多态方法：`move(dx, dy)`、`scale(factor)`、`setAttribute(attr, value)`、`getAttribute(attr)`、`getInlineSummary()`、`getDetails()`、`toSvgLines(indentLevel)`。
  - **`Leaf`（叶子节点）**：`RectShape`、`CircleShape`、`EllipseShape`、`LineShape`、`TextShape`。各自私有封装几何属性（如 `x, y, width, height`），在各自类内部重写 `move`、`scale` 与属性白名单访问逻辑，**彻底消除外部 `switch(shape.type)` 或 `instanceof` 分支**。
  - **`Composite`（组合容器）**：`src/model/GroupShape.ts`。继承自 `Shape`，内部持有 `private children: Shape[] = []`。
    - 其 `move(dx, dy)` 与 `scale(factor)` **不自行计算具体坐标，而是遍历 `children` 递归转发调用**（`child.move(dx, dy)` / `child.scale(factor)`）。
    - 在容器操作中内置**“子节点不能是自身或祖先”的环路不变式检查**（`containsId` / `isAncestorOf`），保障树结构合法性。

#### （2）命令模式（Command Pattern，必选）—— 解耦请求发起、执行与 Undo/Redo
- **设计动机**：将 CLI 输入解析出的编辑请求封装为独立对象，使入口（`CliSession`）与业务接收者（`SvgDocument` / `Shape`）解耦，并支持精确的按步撤销（Undo）与重做（Redo）。
- **五个参与者的代码落地**：
  - **`Command` / `UndoableCommand`（抽象命令插槽）**：`src/command/Command.ts` 与 `src/command/UndoableCommand.ts`。声明 `execute(): CommandResult` 与 `undo(): CommandResult`。
  - **`ConcreteCommand`（具体命令）**：`CreateCommand`、`DeleteCommand`、`MoveCommand`、`ScaleCommand`、`SetCommand`、`GroupCommand`、`UngroupCommand`、`AddToCommand`、`FrontCommand`、`BackCommand` 等。
    - **严格遵守分工判据**：具体命令类**不含复杂业务判断，只绑定 Receiver 与参数并做转发**；
    - **严禁全文档快照**：每个 `UndoableCommand` 仅保存逆操作所需的**最小增量状态**（例如 `DeleteCommand` 仅保存被删 `Shape` 引用、原父容器与原同级下标 `index`；`GroupCommand` 保存每个被收编图形的原父容器及原 `index`；`SetCommand` 保存属性修改前的 `oldValue`），`undo()` 时精确还原。
  - **`Receiver`（接收者）**：`SvgDocument` 与 `Shape` 子类，承担真正的图形树增删改查、Z-order 调整与不变式校验。
  - **`Invoker`（调用者 / 命令栈执行器）**：`src/command/CommandExecutor.ts`。维护 `undoStack`、`redoStack` 以及 `undoAllowedAfterIo` 状态：
    - 执行可撤销编辑命令：先调用 `cmd.execute()`（若抛错则状态不变、不入栈），成功后压入 `undoStack`、清空 `redoStack`，并将 `undoAllowedAfterIo` 设为 `true`。
    - 执行文档/IO 类命令（`init`、`read`、`save`、带参 `canvas`）：执行成功后清空历史栈并将 `undoAllowedAfterIo` 设为 `false`，此后执行 `undo`/`redo` 均拦截并报错 `error: undo not allowed after io command`，直至下一次编辑命令解禁。
    - 执行显示类命令（`tree`、`show`、`help`、无参 `canvas`）：直接执行返回结果，不影响命令栈与 IO 锁。
  - **`Client`（装配者）**：`src/cli/CommandFactory.ts`，将词法 token 装配为具体命令对象并交由 `CommandExecutor` 统一调度。

#### （3）适配器模式与依赖注入（Adapter & Dependency Injection）—— 隔离外部文件 I/O
- **设计动机**：为满足可测试性要求（控制输入、观测输出），领域层与命令层不直接写死 `fs.readFileSync` / `fs.writeFileSync` 或 `console.log`。
- **代码落地**：在 `src/io/FileSystemPort.ts` 定义文件读写抽象接口，生产环境注入 `NodeFileSystemAdapter`，单元测试可注入内存替身（Mock/Fake），实现离线、零副作用的快速自动化测试。

---

### 3. 依赖方向规则

1. **允许的依赖方向（单向无环）**：
   - `cli` $\rightarrow$ `command`、`io`、`model`（入口层负责装配与调度）
   - `command` $\rightarrow$ `model`、`io`（命令层持有并调用领域接收者与序列化服务）
   - `io` $\rightarrow$ `model`（解析器与格式化器操作领域模型）
   - `model` $\rightarrow$ **无外部模块依赖**（纯领域核心，只依赖语言内置标准库）
2. **明确禁止的依赖（违反即为架构缺陷）**：
   - `model` 严禁 import `command`、`io`、`cli` 中的任何文件；
   - `command` 与 `io` 严禁 import `cli` 中的任何文件。
3. **两处合法的按名字分派（标注为待重构项）**：
   - **待重构项 1**：`src/cli/CommandFactory.ts`（根据命令名字符串分发创建具体 `Command` 实例）—— 后续可重构为基于 `CommandProvider` 注册表的插件化分发。
   - **待重构项 2**：`src/model/ShapeFactory.ts`（根据图形类型名字符串分发创建具体 `Shape` 子类）—— 后续 Phase 引入复合图形插件（如 `box`）时，将重构为 `ShapeProvider` 注册表插槽，实现内核零修改扩展。

---

### 4. 变化点假设

| # | 未来最可能发生的变化点 | 预留设计 / 应对策略 | 取舍理由 |
|---|---|---|---|
| 1 | **新增复合图形插件（如 4.4 节的 `box` 类型）** | ① 将图形类型创建集中在 `ShapeFactory` 一处；<br/>② 在 `Shape` 基类预留 `isCompositeShape(): boolean`（默认 `false`）与容器判断 `isContainer(): boolean`，在 `UngroupCommand` 中检查 `isCompositeShape()` 以支持 `error: cannot ungroup composite shape: <id>`。 | 当前阶段不提前实现完整的 `ShapeProvider` 动态加载器（避免过度设计），但把接口契约与分派点收敛在一处，未来升级为插件注册表时既有 `Shape` 与 `Command` 无需修改。 |
| 2 | **新增交互通道（GUI 鼠标拖拽、Web 端、AI Agent 接口）** | 严格分离 `cli` 与 `command`/`model`；所有命令执行结果通过 `CommandResult` 值对象返回而非直接 `console.log`。 | 一套业务层与命令栈可直接被 GUI 按钮、快捷键或 Agent 工具函数复用，无需改动任何领域或命令代码。 |
| 3 | **新增编辑命令或宏命令（Macro / 脚本批量事务）** | 所有编辑动作均实现统一的 `UndoableCommand` 接口，且由 `CommandExecutor` 统一调度。 | 新增命令只需新增一个 `XxxCommand` 类并在 `CommandFactory` 注册；若需宏命令，只需新增一个组合多个 `UndoableCommand` 的 `MacroCommand` 即可。 |
| 4 | **复杂 XPath 路径寻址（如 `/canvas/g1/rect[2]`）** | **决定不预留**，当前统一由 `SvgDocument` 的 `Map<string, Shape>` 按唯一 `id` 寻址。 | 需求已明确以唯一 `id` 寻址是跨 CLI / Agent / 鼠标的正当设计决策，提前引入路径解析器属于无真实需求支撑的过度设计。 |
