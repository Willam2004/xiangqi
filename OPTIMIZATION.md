# REA 分析与优化记录

日期：2026-10-17

## 安装

从官方 npm 包安装 `rea-agents@6.5.0`，官方仓库为 https://github.com/morluto/rea 。已通过 `rea setup --client codex --yes --json` 配置 Codex MCP 与配套技能；`status: ready`，Codex 范围的 `doctor.healthy: true`。本次实际分析通过 CLI 执行，不依赖会话重新加载 MCP。

未安装 Hopper、Ghidra、IDA、JADX。完整环境检查因未安装这些可选引擎而非全绿，但 JavaScript 静态分析正常完成。

## 证据与范围

命令：`rea analyze-javascript-application <项目绝对路径>/dist --json`

原始结果保留在本机 `analysis/rea-before.json`（约 5 MB，不打包到网站）。

Evidence ID：`ev_5ea06e4915a5caa0467c4d6907be3805f54d09b78e3bf27756fcd35b0adf17e8`

REA 读取 4 个源文件，解析 3 个 JavaScript 文件与 HTML，访问 5039 个 AST 节点，解析失败为 0。语义图保留 `engine.js` 的 `moves`、`search`、`best` 与 `app.js` 的 `renderBoard` 函数及源码位置。

这是静态结构证据，不是自动性能分析，也不证明运行时可达性。语义覆盖包含 partial/unknown，动态引用与全局跨脚本绑定没有被证明完整。下面的问题由该证据定位后，通过源码检查和实际测试确认。

## 变更与验证

1. **着法生成**：原先对每枚棋子逐一试探 90 个格点。现预计算各类棋子的几何候选格点，再保留原有占位与自将检查。对固定种子的 160 个合法局面，与穷举原始算法逐着对比，全部一致。
2. **棋盘渲染**：原先每次 renderBoard 都清空并重建 90 个格点和全部棋子。现保留格点与未改变棋子的 DOM 节点，移动棋子复用原节点，以 CSS left/top 过渡呈现移动；键盘焦点可保留。
3. **自适应**：棋子字号依据棋盘容器宽度，宽高按棋盘比例固定，避免窄尺寸下字体撑高棋子。已在 1280 px 桌面和 390 px 手机视口检查。

基准数据：同样的 160 个局面，各运行 7 次取中位数。穷举 12.03 ms，候选筛选 7.12 ms，约 1.69 倍。仅代表本机这组着法生成测试，不代表整局 AI 思考速度提升同样倍数。数据见 `analysis/benchmark.json`。

13 项规则/残局/AI 测试通过。浏览器验证包括人机应手、双人轮流、悔棋、残局通关、刷新恢复、思考中悔棋取消和移动端布局。

## 重现

```sh
node tests/rules.test.cjs
node tests/performance.cjs
```
