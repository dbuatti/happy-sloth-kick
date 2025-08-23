"use client";

import React from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface ResponsiveGridLayoutProps {
  layouts: ReactGridLayout.Layouts;
  onLayoutChange: (layout: ReactGridLayout.Layout[], layouts: ReactGridLayout.Layouts) => void;
  children: React.ReactNode;
  className?: string;
  rowHeight?: number;
  breakpoints?: { lg: number; md: number; sm: number; xs: number; xxs: number };
  cols?: { lg: number; md: number; sm: number; xs: number; xxs: number };
  isDraggable?: boolean;
  isResizable?: boolean;
  compactType?: 'vertical' | 'horizontal' | null;
  preventCollision?: boolean;
}

const ResponsiveGrid: React.FC<ResponsiveGridLayoutProps> = ({
  layouts,
  onLayoutChange,
  children,
  className = "layout",
  rowHeight = 30,
  breakpoints = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
  cols = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
  isDraggable = true,
  isResizable = true,
  compactType = "vertical",
  preventCollision = false,
}) => {
  return (
    <ResponsiveGridLayout
      className={className}
      layouts={layouts}
      breakpoints={breakpoints}
      cols={cols}
      rowHeight={rowHeight}
      onLayoutChange={onLayoutChange}
      isDraggable={isDraggable}
      isResizable={isResizable}
      compactType={compactType}
      preventCollision={preventCollision}
    >
      {children}
    </ResponsiveGridLayout>
  );
};

export { ResponsiveGrid as ResponsiveGridLayout };