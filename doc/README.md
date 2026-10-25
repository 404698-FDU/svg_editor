# Lab1 Phase 1：SVG 编辑器（CLI）架构与工程文档

## 1. 架构方案

### 1.1 模块划分

本系统按照**关注点分离（Separation of Concerns）**与**稳定依赖原则（SDP）**划分为四个核心模块（对应 `src/` 下的四个子目录），所有类与接口严格遵循**“一类一文件（文件名 = 类名 / 接口名）”**的面向对象规范：

| 模块目录 | 模块名称 | 核心职责 | 包含的类 / 接口文件（共 36 个独立文件） |
|---|---|---|---|
| `src/model/` | **领域模型模块（稳定内核）** | 维护 SVG 画布状态、图形组合树结构（Composite）、全局唯一 `id` 索引、多态几何变换（平移、缩放）、属性白名单校验与父子环路不变式检查。**完全独立于 UI 与外部 I/O。** | `SvgDocument.ts`、`Shape.ts`（抽象基类）、`GroupShape.ts`、`RectShape.ts`、`CircleShape.ts`、`EllipseShape.ts`、`LineShape.ts`、`TextShape.ts`、`ShapeFactory.ts` |
| `src/command/` | **命令与历史管理模块** | 将每一次用户请求封装为独立对象（Command），负责向领域接收者（`SvgDocument`）转发请求、保存最小逆操作增量状态，并通过双栈管理 Undo / Redo 及文档 I/O 锁状态。 | `Command.ts`、`UndoableCommand.ts`、`CommandResult.ts`、`CommandExecutor.ts`、`DocumentContext.ts`、`CreateCommand.ts`、`DeleteCommand.ts`、`MoveCommand.ts`、`ScaleCommand.ts`、`SetCommand.ts`、`GroupCommand.ts`、`UngroupCommand.ts`、`AddToCommand.ts`、`FrontCommand.ts`、`BackCommand.ts`、`InitCommand.ts`、`ReadCommand.ts`、`SaveCommand.ts`、`CanvasCommand.ts`、`TreeCommand.ts`、`ShowCommand.ts`、`HelpCommand.ts` |
| `src/io/` | **序列化、格式化与持久化模块** | 负责 SVG XML 文本的解析（含缺失 `id` 自动补全与 warning 收集）、SVG XML 导出序列化、结构树（`tree`）与属性明细（`show`）的文本格式化，以及文件系统读写接口与实现。 | `FileSystemPort.ts`、`NodeFileSystemAdapter.ts`、`SvgParser.ts`、`SvgParseResult.ts`、`SvgSerializer.ts`、`TreeFormatter.ts` |
| `src/cli/` | **命令行交互模块（UI 入口）** | 负责 REPL 交互循环、命令行词法分析（处理 `#` 注释与双引号包裹的含空格参数）、命令名分派（`CommandFactory`）以及统一输出与 `error:` 异常拦截格式化。 | `CommandTokenizer.ts`、`CommandFactory.ts`、`CliSession.ts`、`CliRepl.ts`（以及入口引导文件 `src/index.ts`） |

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
  [DocumentContext]
  [ConcreteCommands\n(Create/Delete/Move/Scale/Set/\nGroup/Ungroup/AddTo/Front/Back/\nInit/Read/Save/Canvas/Tree/Show/Help)]
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
  [LeafShapes\n(Rect/Circle/Ellipse/Line/Text)]
  [ShapeFactory]
}

cli --> command : 创建并委托执行命令
cli --> io : 注入持久化适配器
command --> model : 转发操作到 Receiver (SvgDocument)
command --> io : 文档/显示命令调用解析、序列化与格式化
io --> model : 通过 Shape / ShapeFactory 构建与遍历图形组合树
@enduml
```

---

### 1.2 设计模式的选择与代码落地

#### （1）组合模式（Composite Pattern）—— 统一叶子图形与容器 `<g>`
- **设计动机**：SVG 文档天然是由容器 `<g>` 与基础图形组成的任意深度树形结构，且编辑命令（`move`、`scale`、`set`、`delete`）与展示命令（`tree`、`show`）对容器与叶子一视同仁。
- **角色映射与代码落地**：
  - **`Component`（抽象组件）**：`src/model/Shape.ts`。封装所有图形共有的私有属性（`id`、`parent`、`fill`、`stroke`、`strokeWidth`），声明统一的抽象与多态方法：`move(dx, dy)`、`scale(factor)`、`setAttribute(attr, value)`、`getAttribute(attr)`、`getInlineSummary()`、`getGeometryDetailLine()`、`toSvgLines(indentLevel)`、`formatMoveFeedback(dx, dy, isUndo)`，以及透明式的子节点管理默认实现（叶子节点调用 `addChild` 抛出 `error: not a container: <id>`）。
  - **`Leaf`（叶子节点）**：`RectShape`、`CircleShape`、`EllipseShape`、`LineShape`、`TextShape`。各自私有封装几何属性（如 `x, y, width, height`），在各自类内部重写 `move`、`scale` 与属性白名单访问逻辑，**彻底消除外部 `switch(shape.type)` 或 `instanceof` 分支**。
  - **`Composite`（组合容器）**：`src/model/GroupShape.ts`。继承自 `Shape`，内部持有 `private readonly children: Shape[] = []`。
    - **递归落点**：`GroupShape.move(dx, dy)` 与 `GroupShape.scale(factor)` **不自行计算具体坐标，而是遍历 `children` 递归转发调用**（`child.move(dx, dy)` / `child.scale(factor)`）。
    - **环路不变式检查**：在 `GroupShape.insertChildAt` 与 `SvgDocument.validateGroupTargets` 中内置**“子节点不能是自身或祖先”的环路不变式检查**（`containsDescendant`），保障树结构合法性（对应报错 `error: cannot group a container into its own descendant: <id>`）。

#### （2）命令模式（Command Pattern，必选）—— 解耦请求发起、执行与 Undo/Redo
- **设计动机**：将 CLI 输入解析出的请求封装为独立对象，使入口（`CliSession`）与业务接收者（`SvgDocument` / `Shape`）解耦，并支持精确的按步撤销（Undo）与重做（Redo）。
- **五个参与者的代码落地**：
  - **`Command` / `UndoableCommand`（抽象命令插槽）**：`src/command/Command.ts` 与 `src/command/UndoableCommand.ts`。声明 `execute(): CommandResult` 与 `undo(): CommandResult`。
  - **`ConcreteCommand`（具体命令）**：`CreateCommand`、`DeleteCommand`、`MoveCommand`、`ScaleCommand`、`SetCommand`、`GroupCommand`、`UngroupCommand`、`AddToCommand`、`FrontCommand`、`BackCommand` 等。
    - **严格遵守“命令类只做转发、不含业务逻辑”判据**：具体命令类内部不含业务判断，所有校验与树结构操作均委托给接收者 `SvgDocument`。
    - **严禁全文档快照，采用最小增量逆状态**：
      - `CreateCommand`：`undo()` 调用 `document.deleteShape(id)` 并缓存被删记录，`redo()` 原位恢复同一实例；
      - `DeleteCommand`：保存被删 `Shape` 引用、原父容器 `parentContainer` 与原同级下标 `index`，`undo()` 插回原父容器的原下标位置；
      - `MoveCommand`：`execute()` 转发 `moveShape(id, dx, dy)`，`undo()` 转发 `moveShape(id, -dx, -dy)`；
      - `ScaleCommand`：保存缩放前几何数值列表，`undo()` 精确还原，避免浮点数乘除往返精度损失；
      - `SetCommand`：保存修改前的 `oldValue`，`undo()` 恢复原属性值；
      - `GroupCommand`：保存新建组及所有成员图形的 `(oldParent, oldIndex)`，`undo()` 解散该组并将所有成员按原下标归还至原父容器；
      - `UngroupCommand`：保存原 `GroupShape`、其在父容器中的 `groupIndex` 及原 `children` 列表，`undo()` 重建容器并收拢原归属子节点；
      - `AddToCommand` / `FrontCommand` / `BackCommand`：保存原父容器与原 `oldIndex`，`undo()` 精确移回原位置。
  - **`Receiver`（接收者）**：`SvgDocument` 与 `Shape` 子类，承担真正的图形树增删改查、Z-order 调整与不变式校验。
  - **`Invoker`（调用者 / 命令栈执行器）**：`src/command/CommandExecutor.ts`。维护 `undoStack`、`redoStack` 以及 `lockedAfterIo` 状态：
    - 执行可撤销编辑命令：先调用 `cmd.execute()`（若抛错则状态不变、不入栈），成功后压入 `undoStack`、清空 `redoStack`，并将 `lockedAfterIo` 设为 `false`。
    - 执行文档/IO 类命令（`init`、`read`、`save`、带参 `canvas`）：执行成功后清空历史栈并将 `lockedAfterIo` 设为 `true`，此后执行 `undo`/`redo` 均拦截并报错 `error: undo not allowed after io command`，直至下一次编辑命令解禁。
    - 执行显示类命令（`tree`、`show`、`help`、无参 `canvas`）：直接执行返回结果，不影响命令栈与 IO 锁。
  - **`Client`（装配者）**：`src/cli/CommandFactory.ts`，将词法 token 装配为具体命令对象并交由 `CommandExecutor` 统一调度。

#### （3）适配器模式与依赖注入（Adapter & Dependency Injection）—— 隔离外部文件 I/O
- **设计动机**：为满足 TDD 可测试性要求（控制输入、观测输出），领域层与命令层不直接写死 `fs.readFileSync` / `fs.writeFileSync` 或 `console.log`。
- **代码落地**：在 `src/io/FileSystemPort.ts` 定义 Target 接口，生产环境由 `NodeFileSystemAdapter.ts` 适配 Node.js `fs` 模块，测试环境注入内存替身 `MockFileSystem` / `InMemoryFileSystem`，实现离线、零副作用的快速自动化测试。

---

### 1.3 依赖方向规则

1. **允许的依赖方向（单向无环）**：
   - `cli` $\rightarrow$ `command`、`io`（入口层负责词法解析、命令装配与输出打印）
   - `command` $\rightarrow$ `model`、`io`（命令层持有并调用领域接收者与序列化/格式化服务）
   - `io` $\rightarrow$ `model`（解析器与格式化器通过 `SvgDocument`、`Shape`、`ShapeFactory` 操作领域模型）
   - `model` $\rightarrow$ **无外部模块依赖**（纯领域核心，不依赖任何上层或外层模块）
2. **明确禁止的依赖（违反即为待处理架构缺陷）**：
   - `model` 严禁 import `command`、`io`、`cli` 中的任何文件；
   - `command` 与 `io` 严禁 import `cli` 中的任何文件；
   - 除 `ShapeFactory` 外，任何模块（包括 `io` 和 `command`）不得直接依赖具体叶子子类（`RectShape`、`CircleShape`、`EllipseShape`、`LineShape`、`TextShape`）。
3. **两处合法的按名字分派（标注为待重构项）**：
   - **待重构项 1**：`src/cli/CommandFactory.ts`（根据命令名字符串分发创建具体 `Command` 实例）—— 后续可重构为基于 `CommandProvider` 注册表的插件化分发。
   - **待重构项 2**：`src/model/ShapeFactory.ts`（根据图形类型名字符串分发创建具体 `Shape` 子类，同时服务于 CLI `create` 与 XML `read`）—— 后续 Phase 引入复合图形插件（如 `box`）时，将重构为 `ShapeProvider` 注册表插槽，实现内核零修改扩展。

---

### 1.4 变化点假设

| # | 未来最可能发生的变化点 | 预留设计 / 应对策略 | 取舍理由 |
|---|---|---|---|
| 1 | **新增复合图形插件（如 4.4 节的 `box` 类型）** | ① 将所有图形类型按名创建（含 CLI 创建与 XML 反序列化）100% 收敛在 `ShapeFactory` 一处；<br/>② 在 `Shape` 基类预留 `isCompositeShape(): boolean`（默认 `false`）与容器判断 `isContainer(): boolean`，在 `SvgDocument.ungroupShape` 中检查 `isCompositeShape()` 以支持 `error: cannot ungroup composite shape: <id>`。 | 当前阶段不提前实现完整的动态插件加载器（避免过度设计），但把接口契约与分派点收敛在一处，未来升级为 `ShapeProvider` 注册表时既有 `Shape`、遍历代码与 `Command` 均可做到零修改（空 diff）。 |
| 2 | **新增交互通道（GUI 鼠标拖拽、Web 端、AI Agent 接口）** | 严格分离 `cli` 与 `command`/`model`；所有命令执行结果通过 `CommandResult` 值对象返回而非在业务类内 `console.log`。 | 一套业务层与命令栈可直接被 GUI 按钮、快捷键或 Agent 工具函数复用，无需改动任何领域或命令代码。 |
| 3 | **新增编辑命令或宏命令（Macro / 脚本批量事务）** | 所有编辑动作均实现统一的 `UndoableCommand` 接口，且由 `CommandExecutor` 统一调度。 | 新增命令只需新增一个 `XxxCommand` 类并在 `CommandFactory` 注册；若需宏命令，只需新增一个组合多个 `UndoableCommand` 的 `MacroCommand` 即可。 |
| 4 | **复杂结构路径寻址（如 `/canvas/g1/rect[2]`）** | **决定不预留**，当前统一由 `SvgDocument` 的 `Map<string, Shape>` 按唯一 `id` 寻址。 | 需求已明确以唯一 `id` 寻址是跨 CLI / Agent / 鼠标的正当设计决策，提前引入 XPath 解析器属于无真实需求支撑的过度设计。 |

---

## 2. 过程记录

在采用 TDD 与分步迭代开发本项目的过程中，围绕设计模式落地与边界约束进行了以下三次关键的审查与重构：

1. **纠正命令模式中的“胖命令”与“全量快照 Undo”倾向**
   - **发现问题**：在使用命令模式实现 Undo/Redo 时，常见的偷懒做法是在 `CommandExecutor` 中每次执行前对整个 `SvgDocument` 做深拷贝快照（Memento 快照栈），或者把树节点校验、环路检查直接塞进 `GroupCommand.execute()` / `CreateCommand.execute()` 中。
   - **确认与纠正**：对照课程《命令模式》课件判据（“具体命令只绑定接收者、不含业务逻辑；避免耗费资源的快照方式”），我们将所有图形树增删、父子环路校验、属性白名单校验全部下沉到接收者 `SvgDocument` 与 `Shape` 中；各 `ConcreteCommand` 保持极简（平均仅 25–35 行），只负责调用 `SvgDocument` 并持有其返回的轻量级逆状态记录（如 `DeletedShapeRecord`、`GroupedShapesRecord`）。

2. **收敛 `SvgParser` 中的第 3 处按名分派，消除 `io` 对具体图形子类的耦合**
   - **发现问题**：在实现 `src/io/SvgParser.ts` 的初版代码时，解析器内部为了根据 XML 标签名实例化图形，直接 `import` 了 `RectShape`、`CircleShape`、`EllipseShape`、`LineShape`、`TextShape` 并编写了 `if (tag === 'rect') ... else if (tag === 'circle') ...` 分支。
   - **确认与纠正**：对照作业 2.1 节规范（“按名字分派只允许两处：命令分发与图形工厂”）以及《组合模式》课件验收边界（“新增一种组件只允许新增类，不得修改既有文件”），如果 `SvgParser` 也直接依赖具体子类，未来新增图形类型时除了修改 `ShapeFactory` 还要修改 `SvgParser`。因此我们在 `ShapeFactory` 中增加了 `createFromSvgElement(type, id, attrs, textContent)`，让 `SvgParser` 仅依赖 `ShapeFactory` 与 `SvgDocument`。重构后通过静态扫描确认：全工程除 `ShapeFactory.ts` 外，没有任何其他文件 `import` 具体叶子图形子类。

3. **多态格式化 `move` 反馈与 `tree` 动态列对齐**
   - **发现问题**：对照规范第 6.0 与 6.1 节的典型会话，叶子图形执行 `move` 时反馈绝对坐标（如 `circle#c1 moved to (130,100)`，撤销为 `moved back to (100,100)`），而容器 `<g>` 执行 `move` 时反馈相对位移（如 `g#node2 moved by (0,100)`，撤销为 `moved back by (0,-100)`）。若在 `MoveCommand` 中用 `if (shape.isContainer())` 判断，则会把类型分支泄漏到命令层。
   - **确认与纠正**：我们在抽象基类 `Shape` 上声明了多态方法 `formatMoveFeedback(dx, dy, isUndo)`，由各叶子子类输出 `moved [back] to (x,y)`、由 `GroupShape` 输出 `moved [back] by (dx,dy)`，使 `MoveCommand` 完全无需感知目标图形是叶子还是容器。

---

## 3. 一致性自查

实现完成后，对照第 1 节架构方案进行全量代码核查：

### 3.1 模块划分一致性
- **实际目录结构与方案完全一致**：代码严格分布在 `src/model/`（9 个文件）、`src/command/`（22 个文件）、`src/io/`（6 个文件）、`src/cli/`（4 个文件）以及入口 `src/index.ts`。
- **一类一文件核查**：所有 41 个源码文件均严格遵守“一类（或接口）一文件，且文件名与导出的类名/接口名完全一致”。

### 3.2 依赖方向与范式规则自查
对 `src/` 下全部文件的 `import` 语句与分支关键字进行静态扫描（可通过 `grep -rn "import " src/` 与 `grep -rnE "switch|instanceof" src/` 复现）：

| 检查项 | 架构方案规则 | 实际代码扫描结果 | 是否合规 |
|---|---|---|---|
| `src/model/` 对外依赖 | 严禁依赖 `command`、`io`、`cli` | 仅存在模块内相对引用（`./Shape`、`./GroupShape` 等），外部依赖为 0 | 合规 |
| `src/command/` 对外依赖 | 仅允许依赖 `model`、`io` | 仅引用 `../model/SvgDocument` 与 `../io/*`，无任何 `../cli` 引用 | 合规 |
| `src/io/` 对外依赖 | 仅允许依赖 `model`（且不依赖具体叶子子类） | 仅引用 `../model/SvgDocument`、`../model/Shape`、`../model/ShapeFactory` | 合规 |
| `src/cli/` 对外依赖 | 允许依赖 `command`、`io` | 仅引用 `../command/*` 与 `../io/*` | 合规 |
| 按名字分派位置 | 全工程只允许两处（命令分发与图形工厂） | 仅出现在 `src/cli/CommandFactory.ts` 与 `src/model/ShapeFactory.ts`（各具体 Shape 内部仅对自身几何属性名做读写映射） | 合规 |
| 业务与客户端 `instanceof` | 严禁使用 `instanceof` 判断图形类型 | 全工程对 `Shape` 子类的 `instanceof` 数量为 **0**（唯一一处 `instanceof Error` 位于 CLI 顶层异常捕获） | 合规 |

---

## 4. 质量保证手段

参照《测试驱动的开发（TDD）》课件中“命令模式的分层测试策略”，本项目构建了四层自动化测试体系（使用 Vitest 运行，`npm test` 一键执行）：

1. **第一层：接收者与组合模式单元测试（`tests/model.test.ts`）**
   - 直接测试 `Shape` 多态层次、`GroupShape` 递归组合（嵌套 `move` 与 `scale`）、各图形类型的属性白名单拦截、`ShapeFactory` 未知类型报错，以及 `SvgDocument` 的 ID 唯一性与父子环路不变式检查。
2. **第二层：命令与 Undo/Redo 栈单元测试（`tests/command.test.ts`）**
   - 独立于 CLI 解析器，直接构造全部 10 种可撤销编辑命令（`Create`、`Delete`、`Move`、`Scale`、`Set`、`Group`、`Ungroup`、`AddTo`、`Front`、`Back`）交由 `CommandExecutor` 调度。
   - 重点验证：`undo()` 与 `redo()` 后图形属性、父容器归属及同级子节点下标（Z-Order）是否 100% 精确还原；新编辑命令是否正确清空 `redo` 栈；文档 IO 命令后是否严格锁死 `undo`/`redo` 直至下一次编辑解禁；对顶层容器或复合图形执行 `ungroup` 是否按规范拦截。
3. **第三层：序列化、格式化与 Mock I/O 单元测试（`tests/io.test.ts`）**
   - 通过注入实现 `FileSystemPort` 接口的内存替身 `MockFileSystem`，在不触碰真实磁盘的前提下测试 `ReadCommand`（含缺失 `id` 自动分配 `rect1` 及产生 warning）、`SaveCommand`、`TreeFormatter`（验证 `tree` 与 `show` 格式）以及文件不可读/不可写异常。
4. **第四层：端到端会话回归测试（`tests/cli.e2e.test.ts`）**
   - 将需求文档 [phase_cli_1.md](file:///Users/kophapro/Courses/SoftwareEngineering/SoftwareDesign/pj%E6%96%87%E4%BB%B6/phase_cli_1.md) **第 6.0 节（典型会话）**与**第 6.1 节（两节点流程图会话）**的完整命令序列原样作为输入脚本，逐行断言输出与文档示例 **100% 字符级一致**。
   - 全量覆盖第 4.2 节定义的全部 11 类错误场景，并验证错误发生后画布状态与命令历史栈零污染。
