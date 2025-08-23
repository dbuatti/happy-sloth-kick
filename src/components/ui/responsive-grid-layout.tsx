import React from 'react';
import { Responsive, WidthProvider, Layout, Layouts } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css'; // Required for resizing

interface ResponsiveGridLayoutProps {
  layouts: Layouts;
  onLayoutChange: (layout: Layout[], layouts: Layouts) => void;
  children: React.ReactNode;
  className?: string;
  rowHeight?: number;
  breakpoints?: { [key: string]: number };
  cols?: { [key: string]: number };
  isDraggable?: boolean;
  isResizable?: boolean;
  compactType?: 'vertical' | 'horizontal' | null;
  preventCollision?: boolean;
}

const ResponsiveGridLayout: React.FC<ResponsiveGridLayoutProps> = ({
  layouts,
  onLayoutChange,
  children,
  className = "layout",
  rowHeight = 30,
  breakpoints = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
  cols = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
  isDraggable = true,
  isResizable = true,
  compactType = 'vertical',
  preventCollision = false,
}) => {
  const ResponsiveReactGridLayout = WidthProvider(Responsive);

  return (
    <ResponsiveReactGridLayout
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
    </ResponsiveReactGridLayout>
  );
};

export { ResponsiveGridLayout };