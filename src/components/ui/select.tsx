"use client"

import React from "react" // Import React as default
import * as SelectPrimitives from "@radix-ui/react-select"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import type { ElementRef, ComponentPropsWithoutRef } from 'react'; // Import types

const Select = SelectPrimitives.Root

const SelectGroup = SelectPrimitives.Group

const SelectValue = SelectPrimitives.Value

const SelectTrigger = React.forwardRef<
  ElementRef<typeof SelectPrimitives.Trigger>, // Use ElementRef
  ComponentPropsWithoutRef<typeof SelectPrimitives.Trigger> // Use ComponentPropsWithoutRef
>(({ className, children, ...props }, ref) => (
  <SelectPrimitives.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitives.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitives.Icon>
  </SelectPrimitives.Trigger>
))
SelectTrigger.displayName = SelectPrimitives.Trigger.displayName

const SelectContent = React.forwardRef<
  ElementRef<typeof SelectPrimitives.Content>, // Use ElementRef
  ComponentPropsWithoutRef<typeof SelectPrimitives.Content> // Use ComponentPropsWithoutRef
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitives.Portal>
    <SelectPrimitives.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectPrimitives.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitives.Viewport>
    </SelectPrimitives.Content>
  </SelectPrimitives.Portal>
))
SelectContent.displayName = SelectPrimitives.Content.displayName

const SelectLabel = React.forwardRef<
  ElementRef<typeof SelectPrimitives.Label>, // Use ElementRef
  ComponentPropsWithoutRef<typeof SelectPrimitives.Label> // Use ComponentPropsWithoutRef
>(({ className, ...props }, ref) => (
  <SelectPrimitives.Label
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitives.Label.displayName

const SelectItem = React.forwardRef<
  ElementRef<typeof SelectPrimitives.Item>, // Use ElementRef
  ComponentPropsWithoutRef<typeof SelectPrimitives.Item> // Use ComponentPropsWithoutRef
>(({ className, children, ...props }, ref) => (
  <SelectPrimitives.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitives.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitives.ItemIndicator>
    </span>

    <SelectPrimitives.ItemText>{children}</SelectPrimitives.ItemText>
  </SelectPrimitives.Item>
))
SelectItem.displayName = SelectPrimitives.Item.displayName

const SelectSeparator = React.forwardRef<
  ElementRef<typeof SelectPrimitives.Separator>, // Use ElementRef
  ComponentPropsWithoutRef<typeof SelectPrimitives.Separator> // Use ComponentPropsWithoutRef
>(({ className, ...props }, ref) => (
  <SelectPrimitives.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitives.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
}