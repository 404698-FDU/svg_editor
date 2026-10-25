# SVG 编辑器（CLI 版）— Lab1 Phase 1

> 复旦大学 `CS30075.01 软件设计` 课程项目 Phase 1 实现（基于 **Composite 组合模式**与 **Command 命令模式**）

完整的架构设计方案、PlantUML 组件图、过程记录、一致性自查及质量保证说明详见：
👉 **[`doc/README.md`](./doc/README.md)**

---

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 运行自动化测试（四层单元测试与端到端会话回归测试）

```bash
npm test
```

### 3. 启动交互式 CLI 编辑器

```bash
npm run cli
```

启动后在 `svg> ` 提示符下可输入命令（输入 `help` 查看命令列表，输入 `exit` 退出）：

```text
svg> init 800 600
canvas 800x600 created
svg> create rect bg 0 0 800 600 #ffffff
rect#bg created
svg> create text title 20 40 "My Diagram"
text#title created
svg> create circle c1 100 100 20 red
circle#c1 created
svg> create rect box 200 80 60 60 #3366ff
rect#box created
svg> group markers c1 box
g#markers created with 2 children
svg> tree
svg (800x600)
├── rect#bg        x=0 y=0 w=800 h=600 fill=#ffffff
├── text#title     (20,40) "My Diagram"
└── g#markers
    ├── circle#c1  cx=100 cy=100 r=20 fill=red
    └── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff
svg> read other.svg
warning: assigned id rect1 to unnamed <rect>
read other.svg (7 elements)
```

---

## 目录结构

```text
.
├── doc/
│   └── README.md          # 必交设计文档：架构方案、过程记录、一致性自查、质量保证手段
├── src/
│   ├── model/             # 核心领域层（Shape 抽象类、5 类叶子图形、GroupShape 容器、ShapeFactory、SvgDocument）
│   ├── command/           # 命令编排层（Command / UndoableCommand 接口、CommandExecutor 栈、17 个具体命令类）
│   ├── io/                # 序列化与外部适配层（FileSystemPort、NodeFileSystemAdapter、SvgParser、SvgSerializer、TreeFormatter）
│   ├── cli/               # 交互入口层（CommandTokenizer、CommandFactory、CliSession、CliRepl）
│   └── index.ts           # CLI 启动入口
├── tests/
│   ├── model.test.ts      # 第一层：领域模型与组合模式单元测试
│   ├── command.test.ts    # 第二层：命令模式与 Undo/Redo 栈单元测试
│   ├── io.test.ts         # 第三层：SVG 读写、格式化与 Mock 文件系统单元测试
│   └── cli.e2e.test.ts    # 第四层：规范 6.0 / 6.1 完整会话与 4.2 全错误场景端到端测试
└── other.svg              # 规范第 6 节配套外部测试 SVG 文件（含无 id 元素自动补全验证）
```
