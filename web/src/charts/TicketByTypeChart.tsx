import * as echarts from "echarts";
import BaseChart from "./BaseChart";

type Item = { type: string; count: number };

function TicketByTypeChart({ data }: { data: Item[] }) {
  const option: echarts.EChartsOption = {
    tooltip: { trigger: "axis" as const },
    xAxis: {
      type: "category" as const,
      data: data.map((d) => d.type),
      axisLabel: { color: "#cbd5e1" },
    },
    yAxis: {
      type: "value" as const,
      axisLabel: { color: "#cbd5e1" },
      splitLine: { lineStyle: { color: "#1e293b" } },
    },
    series: [
      {
        type: "bar" as const,
        data: data.map((d) => d.count),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "#22d3ee" },
            { offset: 1, color: "#0ea5e9" },
          ]),
        },
        barWidth: "40%",
      },
    ],
    grid: { left: 45, right: 12, top: 20, bottom: 40 },
  };
  return <BaseChart option={option} height={240} />;
}

export default TicketByTypeChart;
