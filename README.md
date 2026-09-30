# Fool WMS 前端（供应链管理中台）

基于 **Vue 3 + Vite + Element Plus** 的 Fool WMS 仓储管理平台前端单页应用。面向 2B 供应链场景，覆盖基础数据、库存、仓储作业与系统权限管理。

> 项目结构与链路索引见 [`mydocs/codemap/`](mydocs/codemap/) 下的「项目总图」。

## 技术栈

| 维度 | 选型 |
|---|---|
| 框架 | Vue `3.5+`（Composition API / `<script setup>`） |
| 构建 | Vite `7`（`@vitejs/plugin-vue`，别名 `@ -> src`） |
| UI | Element Plus `2.10+`（组件按需引入 JS、样式全量引入，中文语言包 zh-cn） |
| 路由 | Vue Router `4`（`createWebHistory`，全局登录守卫） |
| 状态 | Pinia `3`（setup store 写法） |
| HTTP | Axios `1.10+`（封装于 `src/utils/request.js`） |
| 图表 | ECharts `5` + vue-echarts（按需注册）；Mermaid（智能助手回复中的图表，按需懒加载） |
| 工程化 | ESLint 9 + eslint-plugin-vue、Prettier 3、Vitest（jsdom） |

鉴权采用 **sa-token**：token 存 `localStorage`，请求时注入到请求头（默认 `satoken`）。

## 环境要求

- **Node.js** >= 18（Vite 7 要求）
- **npm** >= 9

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:5174，自动打开；设置 PORT 环境变量时改用该端口且不自动打开）
npm run dev

# 构建生产版本
npm run build

# 本地预览构建产物
npm run preview

# 代码检查 / 自动修复
npm run lint
npm run lint:fix

# 单元测试（composables、store、工具函数，*.test.js 与被测文件同目录）
npm test

# 格式化（Prettier，配置见 .prettierrc.json）
npm run format
```

> 提交前请至少通过 `npm run lint`、`npm test`、`npm run build`。

## 环境配置

通过 `.env.development` / `.env.production` 注入（`import.meta.env.VITE_*`）：

| 变量 | 说明 | development | production |
|---|---|---|---|
| `VITE_API_BASE_URL` | 接口基础路径 | `/api` | `/api` |
| `VITE_APP_TITLE` | 应用标题 | 供应链管理中台 | 供应链管理中台 |
| `VITE_APP_ENV` | 环境标识（影响顶栏环境标签） | development | production |
| `VITE_AGENT_WS_URL` | 智能助手 WebSocket 地址；以 `/` 开头时按当前页面协议与域名拼接（https 自动用 `wss://`） | `ws://localhost:9996/ws/api/scm/agent/qa` | `/ws/api/scm/agent/qa` |

**接口代理**：开发环境下 `vite.config.js` 将 `/api` 代理到后端 `http://localhost:8080`（解决跨域）。生产环境前后端同域部署，由 Nginx / 网关把 `/api` 反向代理到后端、`/ws/api/scm/agent/qa` 代理到 agent 服务（需开启 WebSocket Upgrade）。

## 项目结构

```
fool-wms-front/
├── public/                 # 静态资源
├── docs/                   # 历史开发笔记（CORS/代理/仓库接口实现等）
├── mydocs/codemap/         # 项目/功能级 CodeMap 索引
├── src/
│   ├── main.js             # 入口：装配 Pinia / Router / v-perm 指令 / Element Plus 语言包与服务上下文
│   ├── App.vue             # 根组件：承载 <router-view> + 初始化 appStore
│   ├── router/             # index.js 路由表（即侧边菜单）+ 登录/权限守卫；menuGroups.js 菜单分组图标
│   ├── api/index.js        # 全部后端接口，按业务域分组导出
│   ├── composables/        # useLocalPage（前端分页）、useDialogForm（新增/编辑弹窗）、useOrderDetail（单据明细抽屉）
│   ├── directives/perm.js  # v-perm 按钮级权限
│   ├── utils/
│   │   ├── request.js      # Axios 实例 + 拦截器（token 注入 / 统一响应 / 统一错误提示 / 401 处理）
│   │   ├── confirm.js      # confirmAction：二次确认 → 执行 → 成功提示
│   │   ├── markdown.js     # Markdown 安全渲染 + Mermaid 懒加载渲染
│   │   └── index.js        # settledValue 等通用工具
│   ├── stores/             # Pinia：user（登录/权限）、app（UI 偏好）、refData（货主/仓库/库区/库位/物料参考数据缓存）
│   ├── components/         # Layout（主框架）、ProvinceSelect（省份选择）
│   ├── constants/          # dict（业务字典）、regions（省份数据）
│   ├── views/              # 业务页面（按域分目录）；agent-chat 拆分为消息、输入、WebSocket 等子模块
│   └── styles/             # 品牌变量与公共样式（--brand-* 令牌）
├── .env.development / .env.production
├── vite.config.js          # 含 Vitest 配置
├── eslint.config.js / .prettierrc.json
└── package.json
```

## 功能模块

侧边菜单由 `router/index.js` 中 Layout 的子路由按声明顺序生成：`meta.title` 为菜单与页面标题，`meta.icon` 为一级菜单图标，`meta.group` 为所属分组（分组图标见 `router/menuGroups.js`），`meta.perm` 为访问所需权限（无权限时菜单隐藏、直接访问会被守卫拦截）。

| 分组 | 模块 | 路由 |
|---|---|---|
| — | 仪表盘 / 智能助手 | `/dashboard` `/agent-chat` |
| 基础数据 | 货主 / 仓库 / 库区 / 库位 / 物料 | `/owner` `/warehouse` `/warehouse-area` `/location` `/materials` |
| 库存 | 库存查询（增减/冻结/释放） | `/inventory` |
| 仓储作业 | 入库 / 出库 / 盘点 | `/inbound` `/outbound` `/check` |
| 系统管理 | 用户 / 角色 / 权限 | `/system/user` `/system/role` `/system/permission` |

## 鉴权与请求约定

1. **登录**：`stores/user.js` 的 `login()` 调 `authApi.login` 拿 token，存 `localStorage`（`token` / `tokenName` / `userInfo`），再拉 `authApi.me()` 获取用户信息（含 `roles` / `permissions`）。
2. **路由守卫**：`router/index.js` 中 `beforeEach` 校验登录态（未登录携带 `redirect` 跳转 `/login`，登录后只允许跳回站内路径）；每次页面加载刷新一次 `/auth/me` 权限；`meta.perm` 无权限时回到仪表盘。
3. **请求拦截**：`utils/request.js` 自动从 `localStorage` 读取 token 注入请求头。
4. **响应约定**：`code===200`（或 `code===0` / `success===true`）视为成功并直接返回 `data`；失败时拦截器统一弹出错误提示（页面无需再提示）；`401` 触发登出并重定向登录页。
5. **权限判定**：`userStore.hasPermission(perm)`（支持 `*` 通配）、`userStore.hasRole(role)`；按钮用 `v-perm="'sys:owner:add'"`，权限码与后端 `@SaCheckPermission` 一致。

## 接口层（`src/api/index.js`）

按业务域分组导出，统一走 `request`。分组：`authApi`、`ownerApi`、`warehouseApi`、`warehouseAreaApi`、`locationApi`、`materialApi`、`inventoryApi`、`inboundApi`/`inboundDetailApi`、`outboundApi`/`outboundDetailApi`、`checkApi`/`checkDetailApi`、`userApi`、`roleApi`、`permissionApi`。

> 命名两种风格并存：新域用 RESTful 短名（`list/add/update/delete/getById`），`warehouse`/`material` 域沿用旧视图命名（`getWarehouseList`/`createMaterial` 等）。

## 开发规范

- 统一使用 Vue 3 **Composition API + `<script setup>`**
- 组件名 **PascalCase**，文件/目录名 **kebab-case**
- 所有 `if` 代码块使用大括号
- 新增页面只需在 `router/index.js` 注册路由并配置 `meta`（菜单自动生成）
- 列表 + 弹窗类页面优先复用 `useLocalPage` / `useDialogForm` / `confirmAction` / `refData`，参考 `views/owner/index.vue`
- 主数据增删改后调用 `refData.invalidate(...)`，保证其他页面的下拉数据刷新
