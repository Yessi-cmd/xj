import type { FortuneResult } from "@/app/lib/fortune";
import { scoreGrade } from "@/app/lib/mystic-ranking";

function formatDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  // iOS Safari 要求锚点必须在文档内才会触发下载；延迟回收避免下载开始前 blob 被销毁
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}

export async function createShareImage(result: FortuneResult): Promise<Blob> {
  await document.fonts?.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1440;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("浏览器暂不支持生成分享图。");
  const gradient = context.createLinearGradient(0, 0, 1080, 1440);
  gradient.addColorStop(0, "#10162f");
  gradient.addColorStop(0.58, "#171838");
  gradient.addColorStop(1, "#2d1938");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1080, 1440);
  context.strokeStyle = "rgba(222,174,52,.42)";
  context.lineWidth = 2;
  for (let radius = 160; radius <= 440; radius += 70) {
    context.beginPath();
    context.arc(540, 330, radius, 0, Math.PI * 2);
    context.stroke();
  }
  context.textAlign = "center";
  context.fillStyle = "#e7bd4e";
  context.font = "52px KaiTi, STKaiti, serif";
  context.fillText("玄 鉴 · 每 日 玄 签", 540, 110);
  context.fillStyle = "#fff9e9";
  context.font = "132px KaiTi, STKaiti, serif";
  context.fillText(result.dailyContext.dayPillar, 540, 370);
  context.font = "44px KaiTi, STKaiti, serif";
  context.fillText(`${result.dailyFortune.grade} · ${result.riskProfile}`, 540, 460);
  context.fillStyle = "rgba(255,255,255,.7)";
  context.font = "28px Microsoft YaHei, sans-serif";
  context.fillText(formatDate(result.dailyContext.dateKey), 540, 515);
  const top = result.recommendations.filter((item) => item.isPositive).slice(0, 3);
  top.forEach((item, index) => {
    const y = 650 + index * 190;
    context.fillStyle = "rgba(255,255,255,.075)";
    context.fillRect(100, y, 880, 150);
    context.textAlign = "left";
    context.fillStyle = "#e7bd4e";
    context.font = "30px KaiTi, STKaiti, serif";
    context.fillText(item.roleLabel, 145, y + 48);
    context.fillStyle = "#fff";
    context.font = "bold 42px Microsoft YaHei, sans-serif";
    context.fillText(item.name, 145, y + 103);
    context.textAlign = "right";
    context.fillStyle = "rgba(255,255,255,.6)";
    context.font = "25px Microsoft YaHei, sans-serif";
    context.fillText(`${item.code} · ${scoreGrade(item.combinedScore)}级 · 缘分 ${item.combinedScore}`, 930, y + 88);
  });
  context.textAlign = "center";
  context.fillStyle = "#d55245";
  context.beginPath();
  context.arc(540, 1270, 66, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#fff5df";
  context.font = "30px KaiTi, STKaiti, serif";
  context.fillText("玄学", 540, 1260);
  context.fillText("娱乐", 540, 1298);
  context.font = "24px Microsoft YaHei, sans-serif";
  context.fillStyle = "rgba(255,255,255,.55)";
  context.fillText("不构成买卖建议 · xj.norliva.top", 540, 1380);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("分享图生成失败。")), "image/png"));
}
