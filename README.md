# FinPatrol（云巡）

阿里云巡检 × 多云财务管理的 Agent 工作流平台。

目标是把“巡检 Playbook + 多云账单/资金流 + 工具调用 + 大模型研判”收敛到一套可编排、可审计、可复用的工作台里，让运维与财务在同一条闭环工作流中协同。

## 架构思想（Why）

本项目按三层拆分：

- **UI 层（React）**：负责页面与交互，不直接持久化、不关心存储细节。
- **领域/编排层（Agent & Tools）**：负责“用户意图 → 工具选择/调用 → 结果解释”，并输出可追踪的执行记录。
- **数据层（Repository + IndexedDB）**：负责本地持久化、查询、分页、迁移与兼容策略。

这样做的收益：

- **可扩展**：后续新增云厂商、工具、会话、多 Agent 时不需要重写存储/渲染逻辑。
- **可审计**：工具调用、执行历史、关键输出能留痕，方便复盘。
- **可产品化**：把“到处散落的 localStorage”收敛成统一数据层，后续可平滑切到后端存储。

## 关键技术栈（What）

- **React + Vite + TypeScript + TailwindCSS**
- **react-router-dom**：模块路由（`/overview`、`/workflow` 等）
- **Ant Design X + antd**：面向 LLM/Agent 的对话 UI（Bubble、Sender）
- **Dexie.js（IndexedDB）**：本地数据库（会话、消息、执行历史、缓存数据、接入凭据）
- **Vite proxy**：本地开发时代理阿里云接口，解决 CORS

## 数据层：IndexedDB（Dexie）设计

### 为什么从 localStorage 迁到 IndexedDB

`localStorage` 适合“少量键值”，但不适合：

- 长对话、多会话（容量与性能问题）
- 历史记录可查询、可分页（缺少索引/排序能力）
- 工具调用结果（表格数据规模增大）

因此引入 Dexie（IndexedDB）作为本地数据库，统一承载：

- **Agent 会话与消息**（长期存储、可多会话扩展）
- **执行历史**（最近 N 次、可过滤/排序）
- **资金流水缓存**（避免刷新丢失，后续可做按日期/账号分片）
- **接入凭据配置**（多云 + CFM）

### 表结构（当前版本）

代码位置：`src/db/appDb.ts`

- `kv`：通用键值与迁移标记
- `agentSessions`：会话（预留）
- `agentMessages`：消息（按 `sessionId` 索引）
- `inspectionHistory`：执行历史
- `fundFlowCache`：资金流水缓存
- `cloudTokenConfigs`：接入凭据配置

### Repository 封装

代码位置：`src/db/repository.ts`

原则：**UI 不直接读写 Dexie**，统一通过 repository 方法：

- `loadAgentMessages` / `saveAgentMessages`
- `loadInspectionHistory` / `appendInspectionHistory`
- `loadFundFlowRows` / `saveFundFlowRows`
- `loadCloudTokenConfigs` / `saveCloudTokenConfigs`

### 迁移策略（localStorage → IndexedDB）

首次启动会执行一次“最佳努力迁移”（best-effort）：

- `src/db/repository.ts` 中的 `migrateFromLocalStorageIfNeeded`
- 成功后写入 `kv` 中的迁移完成标记，避免重复迁移

兼容策略：

- 关键能力（如阿里云巡检代理头）仍可保留少量 `localStorage`（例如 `ALIYUN_AUTH_CACHE_KEY`）以保证既有链路稳定。
- 后续可逐步将所有缓存键移出 `localStorage`。

## 安全与风险（必须知道）

- **接入凭据**当前存于浏览器本地（IndexedDB/localStorage）。这对原型与内部使用足够，但并不等同于“安全存储”。
- 推荐的产品化路线：
  - **短期**：最小化存储范围（只存必须字段）、加过期提示、提供“一键清空”
  - **中期**：敏感凭据用 WebCrypto 做本地加密（密钥由用户口令派生或由系统安全存储提供）
  - **长期**：凭据下沉到后端做 KMS/密钥托管 + 统一审计

## 开发与运行

安装依赖：

```bash
npm install
```

本地启动：

```bash
npm run dev
```

构建：

```bash
npm run build
```

## 目录导览

- `src/pages/`：页面级路由容器
- `src/components/landing/`：官网首页组件
- `src/components/dashboard/`：工作台组件（Sidebar/Header/Main）
- `src/db/`：Dexie 数据库与 repository
- `tools/dual-credential-capture-extension/`：浏览器扩展（采集阿里云 + CFM 凭据）
- `public/downloads/`：对外下载的扩展 zip

## 下一步规划（建议）

- **会话体系**：接入 `Conversations`，支持多会话、多 Agent 视角
- **工具回执卡片**：把巡检结果、执行历史、差异对比以结构化卡片渲染（而不是纯文本）
- **分片缓存**：资金流水按账号 + 日期范围分片缓存，避免单 key 过大
- **按路由懒加载**：把 Ant Design X 仅在 `/workflow` 路由加载，降低首屏包体

