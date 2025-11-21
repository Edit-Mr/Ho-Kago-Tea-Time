import * as echarts from "echarts";
import BaseChart from "./BaseChart";

type DataPoint = { grade: "A" | "B" | "C"; value: number };

function FacilityGradePieChart({ data }: { data: DataPoint[] }) {
  const option: echarts.EChartsOption = {
    tooltip: { trigger: "item" as const },
    legend: {
      orient: "vertical" as const,
      right: 10,
      top: 10,
      textStyle: { color: "#cbd5e1" },
    },
    color: ["#22c55e", "#eab308", "#ef4444"],
    series: [
      {
        name: "Health grade",
        type: "pie",
        radius: ["40%", "70%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: "#0f172a",
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: "bold" } },
        data: data.map((d) => ({ value: d.value, name: d.grade })),
      },
    ],
  };
  return <BaseChart option={option} height={240} />;
}

export default FacilityGradePieChart;
