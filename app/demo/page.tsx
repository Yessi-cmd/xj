import CompassExperience from "@/app/components/CompassExperience";

export const metadata = {
  title: "产品演示",
  description: "体验玄鉴每日玄签、缘分册、星轨与加密本命档案。",
};

export default function DemoPage() {
  return <CompassExperience displayName="访客" demoMode />;
}
