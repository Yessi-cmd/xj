import CompassExperience from "@/app/components/CompassExperience";

export const metadata = {
  title: "玄鉴命理投研罗盘",
  description: "一命一盘，千股寻缘。输入出生时空，生成你的 A 股玄学缘分签。",
};

export default function LivePage() {
  return (
    <CompassExperience
      displayName="玄鉴用户"
      standaloneMode
    />
  );
}
