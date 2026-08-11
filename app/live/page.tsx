import CompassExperience from "@/app/components/CompassExperience";

export const metadata = {
  title: "玄鉴命理投研罗盘",
  description: "输入出生时空，生成五行命格画像与量化投资偏好框架。",
};

export default function LivePage() {
  return (
    <CompassExperience
      displayName="玄鉴用户"
      standaloneMode
    />
  );
}
