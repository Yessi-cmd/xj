"use client";

import { useEffect, useRef } from "react";

/** 跟随指针的鎏金光斑与三维微倾，只作用于这些表面。 */
const GLOW_SELECTOR = [
  ".daily-sign-card",
  ".flip-card-back",
  ".surface-card",
  ".today-overview-card",
  ".floating-card",
  ".pipeline-grid article",
  ".collection-card",
].join(",");

/** 进入视口时淡入上浮的区块；签卡自带揭签动画，不在此列。 */
const REVEAL_SELECTOR = [
  "[data-reveal]",
  ".today-overview-card",
  ".approach-heading",
  ".pipeline-grid article",
  ".boundary-section",
  ".sign-heading",
  ".daily-compass",
  ".omen-panel",
  ".natal-summary",
  ".transfer-card",
  ".avoided-card",
  ".collection-card",
  ".history-timeline article",
  ".history-aside",
].join(",");

type Mote = {
  x: number;
  y: number;
  radius: number;
  speed: number;
  drift: number;
  phase: number;
  depth: number;
  hue: "gold" | "jade" | "cinnabar";
};

/** 固定种子的伪随机，仅用于装饰星尘位置，保证每次渲染一致。 */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createMotes(count: number): Mote[] {
  const random = seededRandom(0x5a17);
  return Array.from({ length: count }, () => {
    const roll = random();
    return {
      x: random(),
      y: random(),
      radius: 0.4 + random() * 1.5,
      speed: 0.004 + random() * 0.012,
      drift: (random() - 0.5) * 0.006,
      phase: random() * Math.PI * 2,
      depth: 0.3 + random() * 0.7,
      hue: roll > 0.9 ? "cinnabar" : roll > 0.74 ? "jade" : "gold",
    };
  });
}

const MOTE_COLORS = {
  gold: "240, 211, 138",
  jade: "126, 205, 178",
  cinnabar: "232, 122, 96",
} as const;

export default function AmbientEffects() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    root.classList.toggle("motion-ready", !reducedQuery.matches);

    /* ---------- 星尘画布 ---------- */
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    let frame = 0;
    let width = 0;
    let height = 0;
    let pointerX = 0.5;
    let pointerY = 0.5;
    let easedX = 0.5;
    let easedY = 0.5;
    let lastTime = performance.now();
    let meteor: { x: number; y: number; life: number } | null = null;
    let meteorClock = 0;
    const meteorRandom = seededRandom(0x1c3);
    const motes = createMotes(window.innerWidth < 640 ? 46 : 96);

    const resize = () => {
      if (!canvas || !context) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = (time: number) => {
      if (!context) return;
      const delta = Math.min((time - lastTime) / 16.67, 3);
      lastTime = time;
      easedX += (pointerX - easedX) * 0.04;
      easedY += (pointerY - easedY) * 0.04;
      context.clearRect(0, 0, width, height);

      for (const mote of motes) {
        if (!reducedQuery.matches) {
          mote.y -= mote.speed * 0.01 * delta * mote.depth;
          mote.x += mote.drift * 0.01 * delta;
          if (mote.y < -0.02) mote.y = 1.02;
          if (mote.x < -0.02) mote.x = 1.02;
          if (mote.x > 1.02) mote.x = -0.02;
        }
        const parallax = (mote.depth - 0.3) * 26;
        const x = mote.x * width + (easedX - 0.5) * -parallax;
        const y = mote.y * height + (easedY - 0.5) * -parallax;
        const twinkle = reducedQuery.matches ? 0.7 : 0.45 + Math.sin(time * 0.0012 * mote.depth + mote.phase) * 0.35;
        const alpha = Math.max(0.05, twinkle) * mote.depth;
        const color = MOTE_COLORS[mote.hue];
        const glow = context.createRadialGradient(x, y, 0, x, y, mote.radius * 5);
        glow.addColorStop(0, `rgba(${color}, ${alpha})`);
        glow.addColorStop(1, `rgba(${color}, 0)`);
        context.fillStyle = glow;
        context.beginPath();
        context.arc(x, y, mote.radius * 5, 0, Math.PI * 2);
        context.fill();
      }

      if (!reducedQuery.matches) {
        meteorClock += delta;
        if (!meteor && meteorClock > 520) {
          meteorClock = 0;
          meteor = { x: 0.35 + meteorRandom() * 0.6, y: meteorRandom() * 0.35, life: 0 };
        }
        if (meteor) {
          meteor.life += delta;
          const progress = meteor.life / 70;
          const headX = meteor.x * width - progress * 420;
          const headY = meteor.y * height + progress * 220;
          const fade = Math.sin(Math.min(progress, 1) * Math.PI);
          const trail = context.createLinearGradient(headX, headY, headX + 150, headY - 78);
          trail.addColorStop(0, `rgba(255, 236, 186, ${0.75 * fade})`);
          trail.addColorStop(1, "rgba(255, 236, 186, 0)");
          context.strokeStyle = trail;
          context.lineWidth = 1.2;
          context.beginPath();
          context.moveTo(headX, headY);
          context.lineTo(headX + 150, headY - 78);
          context.stroke();
          if (progress >= 1) meteor = null;
        }
      }

      if (!reducedQuery.matches && !document.hidden) frame = requestAnimationFrame(draw);
      else frame = 0;
    };

    const start = () => {
      if (frame || !context) return;
      lastTime = performance.now();
      frame = requestAnimationFrame(draw);
    };

    const handleVisibility = () => {
      if (!document.hidden && !reducedQuery.matches) start();
    };

    const handleMotionChange = () => {
      root.classList.toggle("motion-ready", !reducedQuery.matches);
      if (reducedQuery.matches) {
        cancelAnimationFrame(frame);
        frame = 0;
        draw(performance.now());
      } else start();
    };

    resize();
    if (reducedQuery.matches) draw(performance.now());
    else start();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", handleVisibility);
    reducedQuery.addEventListener("change", handleMotionChange);

    /* ---------- 指针光斑与卡片微倾 ---------- */
    let glowFrame = 0;
    let lastPointer: PointerEvent | null = null;
    let activeSurface: HTMLElement | null = null;

    const resetSurface = (surface: HTMLElement | null) => {
      if (!surface) return;
      surface.style.removeProperty("--tilt-x");
      surface.style.removeProperty("--tilt-y");
      surface.classList.remove("is-pointer-active");
    };

    const applyPointer = () => {
      glowFrame = 0;
      const event = lastPointer;
      if (!event) return;
      pointerX = event.clientX / Math.max(width, 1);
      pointerY = event.clientY / Math.max(height, 1);
      root.style.setProperty("--pointer-x", `${event.clientX}px`);
      root.style.setProperty("--pointer-y", `${event.clientY}px`);
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>(GLOW_SELECTOR) : null;
      if (target !== activeSurface) {
        resetSurface(activeSurface);
        activeSurface = target;
      }
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;
      target.style.setProperty("--mx", `${localX}px`);
      target.style.setProperty("--my", `${localY}px`);
      target.classList.add("is-pointer-active");
      if (!reducedQuery.matches && finePointer.matches) {
        const tiltY = ((localX / rect.width) - 0.5) * 7;
        const tiltX = ((localY / rect.height) - 0.5) * -7;
        target.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`);
        target.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      lastPointer = event;
      if (!glowFrame) glowFrame = requestAnimationFrame(applyPointer);
    };

    const handlePointerLeave = () => {
      resetSurface(activeSurface);
      activeSurface = null;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", handlePointerLeave);

    /* ---------- 滚动显现 ---------- */
    const revealObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-revealed");
        revealObserver.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    const observeReveals = (scope: ParentNode) => {
      scope.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach((element) => {
        if (element.dataset.revealBound) return;
        element.dataset.revealBound = "true";
        revealObserver.observe(element);
      });
    };

    observeReveals(document);
    const mutationObserver = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches(REVEAL_SELECTOR) && !node.dataset.revealBound) {
            node.dataset.revealBound = "true";
            revealObserver.observe(node);
          }
          observeReveals(node);
        });
      }
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(glowFrame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
      reducedQuery.removeEventListener("change", handleMotionChange);
      window.removeEventListener("pointermove", handlePointerMove);
      document.documentElement.removeEventListener("pointerleave", handlePointerLeave);
      revealObserver.disconnect();
      mutationObserver.disconnect();
      root.classList.remove("motion-ready");
    };
  }, []);

  return <canvas ref={canvasRef} className="ambient-stardust" aria-hidden="true" />;
}
