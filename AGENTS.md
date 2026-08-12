# Repository guidelines

## Product scope

玄鉴是独立部署的传统命理娱乐网站。核心体验为：

`本命盘 × 北京时间流日 × 股票出生标签 × 用户反馈`

网站只提供文化娱乐命签，不提供实时行情、买卖指令、收益预测或投资承诺。新增文案和功能必须持续明确“不构成投资建议”；不要把“有缘”“上签”写成涨跌判断。

## Project structure

- `app/`：React/vinext 路由与界面。
  - `app/components/CompassExperience.tsx`：本命档案、今日开签、缘分册、星轨和分享的主要客户端体验。
  - `app/lib/fortune.ts`：四柱、五行、真太阳时、北京时间流日与每日运势。
  - `app/lib/mystic-ranking.ts`：股票标签类型、缘分评分和六签选择。
  - `app/lib/mystic-state.ts`：`xuanjian.state.v1` 本地状态、反馈、冷却和历史。
  - `app/lib/profile-crypto.ts`：`.xjprofile` 的 PBKDF2-SHA256 + AES-GCM 加解密。
  - `app/live/`：VPS 公网入口；`app/demo/`：免登录体验；`app/dashboard/`：登录保护入口。
- `public/data/mystic-stocks.json`：生产运行时使用的静态股票标签池。
- `app/data/market-snapshot.json`：首页展示的版本化三大指数延时或收盘快照。
- `app/data/china-locations.json`：随前端打包的全国县市与经度静态快照。
- `scripts/`：交易所资料刷新、标签增强与 VPS 静态构建。
- `tests/`：Node 测试和服务端渲染验收。
- `deploy/`：`xj.norliva.top` 的 Caddy 配置。
- `docs/`：架构和产品边界文档。

不要重新引入对 `D:\Code\AShare`、其 Python 包、数据库或目录结构的隐式依赖。若未来需要交换量化数据，使用明确的导出文件或版本化 API。

## Development commands

需要 Node.js `>=22.13.0`。保留 npm 和现有锁文件。

```bash
npm install
npm run dev
npm run lint
npm test
npm run build:vps
```

- `npm test` 会先执行生产构建，再运行页面渲染、排序、本地状态与加密测试。
- `npm run build:vps` 生成被忽略的 `dist-vps/`，并验证 `/live` 可作为公开静态首页。
- `npm run data:refresh` 需要 Python 与 AkShare，并会访问交易所数据源；不要在普通单元测试中调用网络。
- `npm run data:market` 显式刷新上证指数、深证成指和创业板指静态快照；不要在普通构建或测试中调用网络。
- `npm run data:locations` 使用民政部版本化行政区划和固定版本坐标源刷新地点快照；属于显式联网维护操作，不要在普通构建或测试中调用。
- `dist/`、`dist-vps/`、`.next/`、`.vinext/`、`var/` 和 `*.tsbuildinfo` 都是生成状态，不要提交。

## Code style

- 使用严格 TypeScript、ES modules、函数组件和明确类型；公共结构优先使用 `type`。
- 采用两空格缩进、双引号和尾随逗号，保持现有文件风格。
- 将纯计算留在 `app/lib/`；组件负责交互和呈现，不要在 JSX 中复制命理或排序规则。
- 浏览器专属代码必须位于客户端组件或显式函数调用内，避免模块加载时访问 `window`、`localStorage`、`navigator` 或 `crypto`。
- 确定性随机统一基于稳定哈希；禁止使用 `Math.random()` 生成用户可见命签。
- UI 文案使用简体中文。视觉延续玄青、鎏金、朱砂、宣纸质感，不使用通用 AI 仪表盘风格。
- 新交互必须支持键盘、触摸和清晰的 `focus-visible` 状态；尊重 `prefers-reduced-motion`。

## Mystic ranking invariants

除非需求明确改变算法，保持以下权重：

- 本命共振：45%
- 今日流日：25%
- 小众探索：15%
- 用户缘感：10%
- 基础资格：5%

必须维持这些行为：

- 同一本命、北京时间日期和换卦版本产生完全一致的结果。
- 每天恰好生成六种职责，且股票不重复。
- 相冲签 `isPositive === false`，不得混入正向推荐。
- 每日只允许一次换卦；只改变上签、潜龙、同曜和补运，守护签与相冲签保持不变。
- 正向命签执行七日冷却；守护签与相冲签不受该冷却限制。
- “有缘、无感、避开”只影响未来结果，不重排当天已锁定命签。
- 用户反馈最多贡献总分 10%，不能压过本命和流日候选逻辑。
- 日期边界统一使用 `Asia/Shanghai`，不要依赖设备本地时区推断自然日。

修改评分、冷却、职责或日期逻辑时，必须同步更新 `tests/mystic-ranking.test.ts` 和 `docs/architecture.md`。

## Stock data rules

- `public/data/mystic-stocks.json` 是构建产物，同时也是需要提交的版本化生产数据。
- 股票标签应包含五行、阴阳、星曜、神兽、卦宫、灵数、探索度、上市日期、上市日柱、交易所方位和标签版本。
- 只写入数据源提供的真实行业；缺少行业时保持为空，禁止使用“玄学探索”等伪行业占位。
- 缺少上市日期时允许回退到代码灵数盘，不得编造日期或上市日柱。
- 刷新标签后检查 `schemaVersion`、`stockCount`、`tagVersion`，并运行完整测试。
- 网络数据刷新属于显式维护操作；不要在页面加载或生产运行时请求 AkShare。

## Location data rules

- `app/data/china-locations.json` 是需要提交的版本化静态快照，生产页面不得在运行时请求地图、定位或地名接口。
- 地点选择应按“省级 → 市级 → 县区级”逐级联动，支持各级名称筛选，并用完整路径区分重名区县。
- 真太阳时校正优先使用所选县区中心经度；新设区划缺少坐标时允许回退到所属城市经度，不得编造坐标。
- 刷新地点后检查 `schemaVersion`、`divisionVersion`、`locationCount`，并运行完整测试。

## Market snapshot rules

- `app/data/market-snapshot.json` 是需要提交的版本化首页数据；页面不得在运行时请求行情接口。
- 大盘卡必须展示交易日、行情更新时间、数据来源，并在非当日快照时明确写“最近大盘快照”。
- 指数摘要只能描述已发生的同步收涨、同步收跌、分化或持平，不得与流日风水建立因果关系或推断后市。
- 刷新快照后检查 `schemaVersion`、三项指数代码和数值完整性，并运行完整测试。

## Persistence and privacy

- 浏览器状态统一保存在版本化键 `xuanjian.state.v1`，历史最多保留三十天。
- 状态结构变化必须提供安全归一化或迁移路径，不能静默删除缘分册和避开名单。
- `.xjprofile` 密码不得保存、记录或写入导出文件；继续使用 Web Crypto 的 PBKDF2-SHA256 与 AES-GCM。
- 导入必须验证格式和版本、处理错误密码或损坏文件，并在覆盖现有档案前要求确认。
- 分享图、日志、错误信息和页面元数据不得包含出生日期、出生时间、出生地点、邮箱或导出密码。
- 不增加服务端个人数据持久化、D1、R2 或第三方分析，除非用户明确要求并确认隐私边界。

## Testing requirements

任何行为变化至少覆盖对应层：

- 排序与流日：`tests/mystic-ranking.test.ts`
- 本地状态、反馈、冷却与迁移：`tests/mystic-state.test.ts`
- 加密导入导出：`tests/profile-crypto.test.ts`
- 路由、公开入口和认证边界：`tests/rendered-html.test.mjs`

测试必须离线、确定性且不依赖当前日期、市场接口或外部服务。提交前运行：

```bash
npm run lint
npm test
```

可见 UI 改动还应人工检查 390px、平板宽度和 1920px 桌面布局，确认中文字体、分享图与相冲签朱砂警示正常。

## Deployment and source control

- GitHub 远程为 `git@github.com:Yessi-cmd/xj.git`，主分支为 `main`。
- 使用简洁、祈使式提交信息，推荐 Conventional Commit，例如 `feat: add daily omen detail`。
- 不提交密钥、临时档案、构建目录或部署压缩包。
- 只有用户明确要求发布时才修改生产环境。
- VPS 发布先运行 `npm run build:vps`，再创建新的版本化 release；验证 `index.html` 和 `data/mystic-stocks.json` 后原子切换 `current` 符号链接。不要直接覆盖当前 release，并保留可回滚版本。
- 发布后至少验证首页 HTTP 200、每日开签入口、CSP、安全头、标签池 `schemaVersion` 与股票数量。

## Documentation updates

当产品行为、评分公式、存储格式、数据来源或部署方式变化时，同步更新 `README.md`、`docs/architecture.md` 和本文件。文档必须描述已经实现的行为，不写占位符或未确认的未来承诺。
