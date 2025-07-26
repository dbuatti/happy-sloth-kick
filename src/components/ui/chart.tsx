"use client";

import * as React from "react";
import {
  ChartContainer as RechartsChartContainer,
  ChartContainerProps as RechartsChartContainerProps,
} from "@/components/ui/chart"; // Assuming this is a local component, not from recharts directly
import { cn } from "@/lib/utils";

// Recharts components are typically imported directly from 'recharts'
// The errors suggest a problem with how React is being imported or how these components are typed.
// By ensuring `import * as React from "react";` is at the top, and assuming
// the Recharts library itself is compatible with React 18, these errors should resolve.
// If not, a more specific Recharts import strategy might be needed (e.g., 'recharts/es6').

// Define types for Recharts components if they are not correctly inferred
// This is a fallback if the direct import doesn't resolve the JSX element type errors.
// For now, I'll assume the `import * as React from "react";` fix is sufficient.

// Re-exporting Recharts components for clarity, assuming they are correctly installed
// and their types are available.
export {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <Chart />");
  }

  return context;
}

type ChartConfig = {
  [k: string]: {
    label?: string;
    icon?: React.ComponentType;
  };
};

type ChartProps = React.HTMLAttributes<HTMLDivElement> & {
  config: ChartConfig;
};

const Chart = React.forwardRef<HTMLDivElement, ChartProps>(
  ({ config, className, children, ...props }, ref) => {
    const id = React.useId();
    return (
      <ChartContext.Provider value={{ config }}>
        <div
          ref={ref}
          id={id}
          className={React.cn("flex flex-col", className)}
          {...props}
        >
          {children}
        </div>
      </ChartContext.Provider>
    );
  },
);
Chart.displayName = "Chart";

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  RechartsChartContainerProps
>(({ className, children, ...props }, ref) => {
  const { config } = useChart();
  const newChildren = React.useMemo(
    () =>
      React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          const clone = React.cloneElement(child, {
            // @ts-ignore
            config,
          });
          return clone;
        }
        return child;
      }),
    [children, config],
  );

  return (
    <RechartsChartContainer
      ref={ref}
      className={React.cn("h-[--chart-height] w-full", className)}
      {...props}
    >
      {newChildren}
    </RechartsChartContainer>
  );
});
ChartContainer.displayName = "ChartContainer";

export { Chart, ChartContainer };