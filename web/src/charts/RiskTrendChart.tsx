import * as echarts from "echarts";
import BaseChart from "./BaseChart";

type Point = { date: string; score: number };

function RiskTrendChart({ data }: { data: Point[] }) {
  const option: echarts.EChartsOption = {
    tooltip: { trigger: "axis" as const },
    xAxis: {
      type: "category" as const,
      data: data.map((d) => d.date),
      boundaryGap: false,
      axisLabel: { color: "#94a3b8" },
    },
    yAxis: {
      type: "value" as const,
      axisLabel: { color: "#94a3b8" },
      splitLine: { lineStyle: { color: "#1e293b" } },
    },
    series: [
      {
        data: data.map((d) => d.score),
        type: "line" as const,
        smooth: true,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(37, 99, 235, 0.35)" },
            { offset: 1, color: "rgba(37, 99, 235, 0)" },
          ]),
        },
        lineStyle: { color: "#3b82f6", width: 3 },
        symbol: "none",
      },
    ],
    grid: { left: 40, right: 12, top: 20, bottom: 30 },
  };

  return <BaseChart option={option} height={240} />;
}

export default RiskTrendChart;
