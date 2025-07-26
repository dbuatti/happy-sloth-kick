"use client"

import React from "react" // Import React as default
import * as PopoverPrimitives from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"
import type { ElementRef, ComponentPropsWithoutRef } from 'react'; // Import types

const Popover = PopoverPrimitives.Root

const PopoverTrigger = PopoverPrimitives.Trigger

const PopoverContent = React.forwardRef<
  ElementRef<typeof PopoverPrimitives.Content>, // Use ElementRef
  ComponentPropsWithoutRef<typeof PopoverPrimitives.Content> // Use ComponentPropsWithoutRef
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitives.Content
    ref={ref}
    align={align}
    sideOffset={sideOffset}
    className={cn(
      "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
PopoverContent.displayName = PopoverPrimitives.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }