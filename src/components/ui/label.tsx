"use client";

import { forwardRef, ElementRef, ComponentPropsWithoutRef } from "react";
import * as LabelPrimitives from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);

const Label = forwardRef<
  ElementRef<typeof LabelPrimitives.Root>,
  ComponentPropsWithoutRef<typeof LabelPrimitives.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitives.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
));
Label.displayName = LabelPrimitives.Root.displayName;

export { Label };