import { useEffect, useRef } from "react";
import * as echarts from "echarts";

type Props = {
  option: echarts.EChartsOption;
  height?: number;
};

function BaseChart({ option, height = 260 }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [option]);

  return <div ref={ref} style={{ width: "100%", height }} />;
}

export default BaseChart;
