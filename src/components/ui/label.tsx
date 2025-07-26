"use client"

import React from "react" // Import React as default
import * as LabelPrimitives from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import type { ElementRef, ComponentPropsWithoutRef } from 'react'; // Import types

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

const Label = React.forwardRef<
  ElementRef<typeof LabelPrimitives.Root>, // Use ElementRef
  ComponentPropsWithoutRef<typeof LabelPrimitives.Root> & // Use ComponentPropsWithoutRef
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitives.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
))
Label.displayName = LabelPrimitives.Root.displayName

export { Label }