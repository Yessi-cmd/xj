import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(projectRoot, "dist-vps");
const clientDir = resolve(projectRoot, "dist", "client");
const workerPath = resolve(projectRoot, "dist", "server", "index.js");

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await cp(clientDir, outputDir, { recursive: true });

const moduleUrl = pathToFileURL(workerPath);
moduleUrl.searchParams.set("vps-build", Date.now().toString());
const { default: worker } = await import(moduleUrl.href);

const response = await worker.fetch(
  new Request("https://xj.norliva.top/live", {
    headers: {
      accept: "text/html",
      host: "xj.norliva.top",
      "x-forwarded-host": "xj.norliva.top",
      "x-forwarded-proto": "https",
    },
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

if (!response.ok) {
  throw new Error(`Unable to render the VPS entry page: HTTP ${response.status}`);
}

const html = await response.text();
if (!html.includes("玄鉴命理投研罗盘") || html.includes("signin-with-chatgpt")) {
  throw new Error("The rendered VPS page failed its public-entry validation.");
}

await writeFile(resolve(outputDir, "index.html"), html, "utf8");
await writeFile(resolve(outputDir, "404.html"), html, "utf8");

const generated = await readFile(resolve(outputDir, "index.html"), "utf8");
console.log(`Built public VPS bundle (${Buffer.byteLength(generated)} bytes of HTML).`);
