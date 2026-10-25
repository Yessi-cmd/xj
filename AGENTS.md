# Repository guidelines

## Product scope

玄鉴是独立部署的传统命理娱乐网站。核心体验为：

`本命盘 × 北京时间流日 × 股票出生标签 × 用户反馈`

网站只提供文化娱乐命签，不提供实时行情、买卖指令、收益预测或投资承诺。新增文案和功能必须持续明确“不构成投资建议”；不要把“有缘”“上签”写成涨跌判断。

## Project structure

- `app/`：React/vinext 路由与界面。
  - `app/components/CompassExperience.tsx`：本命档案、今日开签、缘分册、星轨和分享的主要客户端体验。
  - `app/components/DailySignCard.tsx`：单张命签、折叠事实资料与缘分反馈。
  - `app/components/ProfileTransferCard.tsx`：低频档案导入导出界面。
  - `app/components/LunarBirthDatePicker.tsx`：农历年、月（含闰月）、日选择与对应公历日期提示。
  - `app/components/AmbientEffects.tsx`：根布局中的装饰星尘画布、指针光斑、签卡微倾与滚动显现。
  - `app/styles/aurora.css`：最后加载的玄青夜幕视觉与动效层；新增动效须在此统一并尊重 `prefers-reduced-motion`。
  - `app/lib/fortune.ts`：四柱、五行、真太阳时、北京时间流日与每日运势。
  - `app/lib/lunar-date.ts`：公历与农历生日互转、闰月和大小月校验。
  - `app/lib/mystic-ranking.ts`：股票标签类型、缘分评分和六签选择。
  - `app/lib/mystic-state.ts`：`xuanjian.state.v1` 本地状态、反馈、冷却和历史。
  - `app/lib/profile-crypto.ts`：`.xjprofile` 的 PBKDF2-SHA256 + AES-GCM 加解密。
  - `app/live/`：VPS 公网入口；`app/demo/`：免登录体验；`app/dashboard/`：登录保护入口。
- `public/data/mystic-stocks.json`：完整、版本化股票源数据；`public/data/mystic-stock-index.json` 与 `public/data/mystic-stock-facts/` 是需要一并提交的运行时索引和事实分片。
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
npm run typecheck
npm test
npm run build:vps
```

- `npm test` 会先执行严格类型检查和生产构建，再运行页面渲染、排序、本地状态与加密测试。
- `npm run build:vps` 先严格检查数据新鲜度，再生成被忽略的 `dist-vps/`，并验证 `/live`、完整标签池、运行时索引与事实分片。
- `npm run data:runtime` 离线从完整标签池重建紧凑排序索引和事实分片；普通构建会自动执行。
- `npm run data:check` 离线报告大盘与个股事实快照年龄；添加 `--strict` 时超过阈值即失败。
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
- 本命录入页以表单为主要任务，桌面端罗盘只作辅助装饰，不得与表单等宽争夺空间；表单两列控件须保持顶边、控件高度和行距一致，并在窄屏自然收为单列。
- 新档案不得预填可被误提交的示例性别、生日或地点；性别、出生日期和出生地点必须由用户明确选择后才能启盘。
- 签卡中的行业、市值、营收与历史涨跌属于静态事实资料，默认折叠并与文化签文分层，不得把事实字段写成签文结论。
- 开签结果页先呈现结果标题与六张签卡，再呈现流日罗盘和宜忌解读；桌面与移动端保持相同内容顺序。
- 跨设备迁移属于低频档案工具，默认以紧凑的折叠区呈现；用户主动展开后才显示密码、导出和导入控件。密码不足六位或尚无档案时，导出按钮必须保持禁用并提供明确状态。
- 新交互必须支持键盘、触摸和清晰的 `focus-visible` 状态；尊重 `prefers-reduced-motion`。

## Mystic ranking invariants

除非需求明确改变算法，保持以下权重：

- 本命共振：45%
- 今日流日：25%
- 小众探索：15%
- 用户缘感：10%
- 基础资格：5%

缘分分按固定阈值映射为 S（≥80）、A（≥70）、B（≥60）、C（≥50）、D（<50）五档展示评级；评级只作展示层级，不参与排序。

必须维持这些行为：

- 同一本命、北京时间日期和换卦版本产生完全一致的结果。
- 每天恰好生成六种职责，且股票不重复。
- 相冲签 `isPositive === false`，不得混入正向推荐。
- 每日可无限次换卦；每次换卦只改变上签、潜龙、同曜和补运，守护签与相冲签保持不变。
- 正向命签执行七日冷却；守护签与相冲签不受该冷却限制。
- 守护签随本命盘恒定，不随月份轮换，尊重无感与避开名单，但不受七日冷却与换卦影响。
- “有缘、无感、避开”只影响未来结果，不重排当天已锁定命签。
- 用户反馈最多贡献总分 10%，不能压过本命和流日候选逻辑。
- 日期边界统一使用 `Asia/Shanghai`，不要依赖设备本地时区推断自然日。
- 只有用户主动开签才计入当日历史与连续天数；已保存档案同日进入时恢复当天锁定命签，北京时间跨日后必须回到开签界面，不得继续展示昨日命签。
- 新档案默认不要求出生时间；用户未开启时以正午作确定性中性估算，并明确标记估算时柱。旧档案缺少开关字段时继续视为已提供时间，避免静默改变既有命盘。
- 出生日期支持公历与农历（含闰月）录入；农历必须先换算为规范公历 `birthDate` 再进入既有排盘逻辑，并保留经过校验的原始农历选择。同一自然日无论用哪种历法录入都必须产生相同本命指纹；旧档案缺少历法字段时继续按公历处理。
- 进阶本命信息（幸运数字、行业偏好、守护神兽、晨昏偏好、血型）全部可选、默认中性；选定的守护神兽成为本命神兽，晨昏偏好决定本命阴阳，血型参与本命主星分配，幸运数字与行业偏好只在本命维度小幅加分，不改变五大权重。这些输入并入本命指纹与排盘键，同一组输入与日期、换卦版本始终得到相同结果；旧档案缺少进阶字段时按未设置处理。

修改评分、冷却、职责或日期逻辑时，必须同步更新 `tests/mystic-ranking.test.ts` 和 `docs/architecture.md`。

## Stock data rules

- `public/data/mystic-stocks.json` 是构建产物，同时也是需要提交的版本化生产数据。
- 排序运行时只加载 `public/data/mystic-stock-index.json`；六签确定后再从 `public/data/mystic-stock-facts/` 的本站静态分片补齐事实字段。两者均由 `npm run data:runtime` 生成，不得手工编造或造成与完整源不一致。
- 股票标签应包含五行、阴阳、星曜、神兽、卦宫、灵数、探索度、上市日期、上市日柱、交易所方位、真实行业和标签版本，以及基本面快照字段：总市值、市盈率、当日与 5 日涨跌幅、主营业务简介、主营收入与报告期、证监会行业。
- 只写入数据源提供的真实行业；缺少行业时保持为空，禁止使用“玄学探索”等伪行业占位。
- 缺少上市日期时允许回退到代码灵数盘，不得编造日期或上市日柱。
- 基本面快照在 VPS 上用 `python3 scripts/fetch-stock-facts.py` 抓取（腾讯行情 + 东方财富 F10），回传后执行 `npm run data:facts:merge` 合并并升 `schemaVersion`；快照缺失的个股字段保持为空，不得编造。
- 总市值字段单位为亿元，东方财富 F10 主营收入字段单位为人民币元；展示层必须使用各自的格式化函数，禁止混用金额单位。
- 刷新标签后检查 `schemaVersion`、`stockCount`、`tagVersion`，并运行完整测试。
- 网络数据刷新属于显式维护操作；不要在页面加载或生产运行时请求 AkShare、腾讯行情或东财接口。

## Location data rules

- `app/data/china-locations.json` 是需要提交的版本化静态快照，生产页面不得在运行时请求地图、定位或地名接口。
- 地点选择应按“省级 → 市级 → 县区级”逐级联动，支持各级名称筛选，并用完整路径区分重名区县。
- 真太阳时校正优先使用所选县区中心经度；新设区划缺少坐标时允许回退到所属城市经度，不得编造坐标。
- 刷新地点后检查 `schemaVersion`、`divisionVersion`、`locationCount`，并运行完整测试。

## Market snapshot rules

- `app/data/market-snapshot.json` 是需要提交的版本化首页数据；页面不得在运行时请求行情接口。
- 大盘卡必须展示交易日、行情更新时间、数据来源，并在非当日快照时明确写“最近大盘快照”。
- 大盘卡在非当日快照时还应显示距今天数；`build:vps` 默认拒绝早于 7 天的大盘快照和早于 14 天的个股事实快照，需要维护者显式刷新，普通构建不得偷偷联网。
- 指数摘要只能描述已发生的同步收涨、同步收跌、分化或持平，不得与流日风水建立因果关系或推断后市。
- 刷新快照后检查 `schemaVersion`、三项指数代码和数值完整性，并运行完整测试。

## Persistence and privacy

- 浏览器状态统一保存在版本化键 `xuanjian.state.v1`，历史最多保留三十天。
- 状态结构变化必须提供安全归一化或迁移路径，不能静默删除缘分册和避开名单。
- 恢复历史时必须验证流日、运势、签卡嵌套字段，并仅接受代码不重复、六种职责齐全的完整签局。
- `.xjprofile` 密码不得保存、记录或写入导出文件；继续使用 Web Crypto 的 PBKDF2-SHA256 与 AES-GCM。
- 档案工具默认折叠；导出必须同时满足“已有本命档案”和“密码至少六位”，导入继续允许用户先选择文件再输入密码解密。
- 导入必须验证格式和版本、处理错误密码或损坏文件，并在覆盖现有档案前要求确认。
- 导入必须在 PBKDF2 派生前限制文件体积、迭代次数、盐、IV 和密文长度；解密后继续验证内部状态版本。
- 分享图、日志、错误信息和页面元数据不得包含出生日期、出生时间、出生地点、邮箱或导出密码。
- 不增加服务端个人数据持久化、D1、R2 或第三方分析，除非用户明确要求并确认隐私边界。

## Testing requirements

任何行为变化至少覆盖对应层：

- 排序与流日：`tests/mystic-ranking.test.ts`
- 本地状态、反馈、冷却与迁移：`tests/mystic-state.test.ts`
- 加密导入导出：`tests/profile-crypto.test.ts`
- 首次档案校验与金额单位：`tests/profile-draft.test.ts`、`tests/stock-display.test.ts`
- 数据发布新鲜度：`tests/data-freshness.test.mjs`
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
- VPS 发布先运行 `npm run build:vps`，再创建新的版本化 release；验证 `index.html`、`data/mystic-stocks.json`、`data/mystic-stock-index.json` 和 `data/mystic-stock-facts/` 后原子切换 `current` 符号链接。不要直接覆盖当前 release，并保留可回滚版本。
- 发布后至少验证首页 HTTP 200、每日开签入口、CSP、安全头、完整标签池与运行时索引的 `schemaVersion`、股票数量和事实分片可读性。

## Documentation updates

当产品行为、评分公式、存储格式、数据来源或部署方式变化时，同步更新 `README.md`、`docs/architecture.md` 和本文件。文档必须描述已经实现的行为，不写占位符或未确认的未来承诺。

换卦使用玄青鎏金风格的站内确认弹窗，支持键盘操作与 Esc 取消。股票静态事实资料默认折叠，展开后在独立滚动区域展示完整简介，不截断正文；可通过触摸、滚轮和键盘查看。

手机窄屏（≤640px）的翻牌开签使用三列小牌阵；轻触后签卡从牌位放大为浮层，轻触空白处、“收起”或 Esc 缩回原牌位，牌位改显已翻开的股票名与评级。桌面与平板继续原地翻牌。

## RackNerd 低流量自动更新

- RackNerd 使用 `xuanjian-data-update.timer`，按北京时间周一至周五 16:30 执行，随机延迟不超过两分钟；`Persistent=true` 在服务器恢复后补触发。运行前用文件锁避免重复抓取。
- 先用一次三大指数请求检查交易日；交易日未变化时跳过股票抓取和发布（节假日也不会重复全量下载）。每个新交易日刷新批量行情，并在服务器保留最近三十个收盘快照；只请求一次上证指数六根日线来确定五个交易日边界，用对应两日真实收盘价计算五日收盘涨跌（未复权）。未积累够六个交易日或对应日期缺失时，该字段留空，不逐股请求 K 线。公司简介、真实行业和营收等 F10 资料至少间隔七天刷新一次，不再跨日复用 `/tmp` 断点文件。
- 公司资料请求缺失时保留上次真实字段；当日行情缺失字段为空，不伪造新值。发布要求当日行情覆盖率至少 95%、每周公司概况和营收同时有效的覆盖率至少 90%，否则保留当前线上版本。
- 维护源码在 `/opt/xuanjian-updater/source`，独立 Node 运行环境在 `/opt/xuanjian-updater/node`。首次安装依赖后，每日复用依赖在 VPS 本地执行 `npm run build:vps`，不进行 npm 安装或整站往返上传。`scripts/update-vps-data.py` 更新版本化源数据，`scripts/validate-data-release.py` 校验完整池、索引及全部事实分片；构建完成后创建 `auto-data-*` release 并原子切换 `current`，HTTP 或安全头检查失败会切回上一版本。
- `/var/log/xuanjian-data-update.log` 记录抓取请求次数、成功响应体字节数、跳过原因和发布结果（字节数不含 TCP/TLS、HTTP 头以及失败响应流量）；日志每周轮转、压缩，保留八份。`/var/lib/xuanjian-updater/last-success` 和 `last-failure` 保存最近成功、失败记录。使用 `systemctl status xuanjian-data-update.service` 和 `systemctl list-timers xuanjian-data-update.timer` 排查执行状态。
- 三大指数静态快照同时发布为 `data/market-snapshot.json`，页面仍展示构建时注入的版本化数据；生产浏览器不请求第三方行情接口。每周公司资料的抓取时间记录在 `factsSnapshot.profilesCapturedAt`，旧快照缺少该字段时首次执行会刷新公司资料。
- 离线维护测试：`python3 -m unittest discover -s tests -p '*test.py'`；该测试不访问行情源。常规应用验证仍执行 `npm run lint`、`npm test`。
自动更新的大盘首选东方财富；其接口不可用时读取腾讯同一组三大指数的真实收盘数据，并在页面来源字段中标明腾讯行情。不会用旧值推算或填造指数。

后续代码发布必须同步维护源码和 .updater-source-id 标识。自动任务发现线上 release 与维护源码标识不一致时会停止，避免翌日定时构建覆盖人工发布的新功能；初始化显式使用 --force。

完整股票源的 schemaVersion 升为 4，股票命理 tagVersion 仍为 3.0；排序规则不变。五日收盘涨跌明确为未复权口径，自动更新只用真实收盘缓存和指数给出的交易日边界计算，不足时为空。

自动生成的 auto-data-* release 保留最近十四个，并额外保护当前及上一个版本；不会清理原有人工发布版本。公司资料断点只在同一周度抓取周期且未超过七天时复用，成功完成后从该周期最早抓取时间计算下一次刷新。

若服务器在周五收盘后未完成更新、到周末才恢复，持久定时器补触发仍会核对最新交易日并补齐；已保存周五收盘的周末执行直接跳过，不产生行情请求。
