"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const SidebarContext = React.createContext<{ open: boolean }>({ open: false });

function useSidebar() {
  const context = React.useContext(SidebarContext);

  if (!context) {
    throw new Error("useSidebar must be used within a <Sidebar />");
  }

  return context;
}

const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    defaultOpen?: boolean;
  }
>(({ open, onOpenChange, className, children, ...props }, ref) => {
  const [isOpen, setIsOpen] = React.useState(open ?? props.defaultOpen ?? false);

  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      setIsOpen(newOpen);
      onOpenChange?.(newOpen);
    },
    [onOpenChange],
  );

  return (
    <SidebarContext.Provider value={{ open: isOpen }}>
      <div
        ref={ref}
        className={React.cn(
          "flex h-full",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
});
Sidebar.displayName = "Sidebar";

const SidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
  }
>(({ className, asChild = false, ...props }, ref) => {
  const { open, onOpenChange } = useSidebar();
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      ref={ref}
      className={React.cn(className)}
      onClick={() => onOpenChange?.(!open)}
      {...props}
    />
  );
});
SidebarTrigger.displayName = "SidebarTrigger";

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    side?: "left" | "right";
  }
>(({ className, children, side = "left", ...props }, ref) => {
  const { open } = useSidebar();

  const style: React.CSSProperties = React.useMemo(() => {
    if (side === "left") {
      return { transform: open ? "translateX(0)" : "translateX(-100%)" };
    }
    return { transform: open ? "translateX(0)" : "translateX(100%)" };
  }, [open, side]);

  return (
    <div
      ref={ref}
      style={style}
      className={React.cn(
        "fixed inset-y-0 z-50 w-64 bg-background shadow-lg transition-transform duration-300 ease-in-out",
        side === "left" ? "left-0 border-r" : "right-0 border-l",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});
SidebarContent.displayName = "SidebarContent";

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={React.cn("flex items-center justify-between p-4", className)}
    {...props}
  />
));
SidebarHeader.displayName = "SidebarHeader";

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={React.cn("p-4 border-t", className)}
    {...props}
  />
));
SidebarFooter.displayName = "SidebarFooter";

const SidebarTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={React.cn("text-xl font-semibold", className)}
    {...props}
  />
));
SidebarTitle.displayName = "SidebarTitle";

const SidebarDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={React.cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
SidebarDescription.displayName = "SidebarDescription";

const SidebarNav = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <nav
    ref={ref}
    className={React.cn("flex flex-col p-2 space-y-1", className)}
    {...props}
  />
));
SidebarNav.displayName = "SidebarNav";

const sidebarLinkVariants = cva(
  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
  {
    variants: {
      variant: {
        default: "text-muted-foreground",
        active: "bg-primary text-primary-foreground",
      },
      size: {
        default: "h-10",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface SidebarLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof sidebarLinkVariants> {
  asChild?: boolean;
}

const SidebarLink = React.forwardRef<HTMLAnchorElement, SidebarLinkProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "a";
    return (
      <Comp
        className={React.cn(sidebarLinkVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
SidebarLink.displayName = "SidebarLink";

export {
  Sidebar,
  SidebarTrigger,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarTitle,
  SidebarDescription,
  SidebarNav,
  SidebarLink,
};