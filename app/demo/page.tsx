import CompassExperience from "@/app/components/CompassExperience";

export const metadata = {
  title: "产品演示",
  description: "体验玄鉴的命理罗盘、命格画像与股票基金推荐框架。",
};

export default function DemoPage() {
  return <CompassExperience displayName="访客" demoMode />;
}
