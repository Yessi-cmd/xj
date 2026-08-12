import assert from "node:assert/strict";
import test from "node:test";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);

async function render(pathname = "/", headers = {}) {
  const moduleUrl = new URL(workerUrl);
  moduleUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(moduleUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html", ...headers },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the finished public landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>玄鉴｜命理投研罗盘<\/title>/);
  assert.match(html, /一命一盘/);
  assert.match(html, /命理共振/);
  assert.match(html, /产品演示/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("renders the end-to-end demo shell without authentication", async () => {
  const response = await render("/demo");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /一命一盘/);
  assert.match(html, /请入生辰/);
  assert.match(html, /启盘 · 寻找我的缘分股/);
  assert.match(html, /每日玄签/);
  assert.match(html, /近5,000只A股玄学标签池/);
  assert.match(html, /本命 · 流日 · 反馈已连接/);
  assert.match(html, /生辰只在本机推演/);
  assert.match(html, /全国县市 · 经度校正/);
  assert.match(html, /省级 \/ 市级 \/ 县区级/);
  assert.match(html, />男<\/button>/);
  assert.match(html, />女<\/button>/);
  assert.doesNotMatch(html, /先守量化纪律|本产品原型不构成投资建议/);
});

test("renders a public standalone VPS entry without Sites authentication links", async () => {
  const response = await render("/live");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /玄鉴命理投研罗盘/);
  assert.match(html, /公开测试版/);
  assert.match(html, /启盘 · 寻找我的缘分股/);
  assert.match(html, /一命一盘/);
  assert.doesNotMatch(html, /本局取象/);
  assert.doesNotMatch(html, /命理共振\s*70%/);
  assert.doesNotMatch(html, /小众探索\s*20%/);
  assert.doesNotMatch(html, /基础过滤\s*10%/);
  assert.doesNotMatch(html, /signin-with-chatgpt|signout-with-chatgpt/);
  assert.doesNotMatch(html, /方法说明|先守量化纪律|本产品原型不构成投资建议/);
});

test("keeps the personal dashboard behind sign-in", async () => {
  const response = await render("/dashboard");
  assert.ok([302, 303, 307, 308].includes(response.status));
  assert.match(
    response.headers.get("location") ?? "",
    /^\/signin-with-chatgpt\?return_to=%2Fdashboard$/,
  );
});
