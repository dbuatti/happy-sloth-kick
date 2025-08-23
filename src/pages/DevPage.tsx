"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Check } from "lucide-react";
import toast from "react-hot-toast";
// Removed: import { cn } from "@/lib/utils";

const DevPage: React.FC = () => {
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toast.success("Simple Button Clicked!");
  };

  const handleButtonTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toast.success("Simple Button TouchStart!");
  };

  const handleCheckboxChange = (checked: boolean) => {
    setCheckboxChecked(checked);
    toast.success(`Checkbox: ${checked ? "Checked" : "Unchecked"}`);
  };

  const handleDropdownTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toast.success("Dropdown Trigger Clicked!");
  };

  const handleDropdownTriggerTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toast.success("Dropdown Trigger TouchStart!");
  };

  const handleDraggableAreaTouchStart = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling
    toast.success("Draggable Area TouchStart (prevented default)");
  };

  const handleDraggableAreaTouchMove = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling
    toast.success("Draggable Area TouchMove (prevented default)");
  };

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">iOS Touch Debug Page</h1>

      <p className="text-sm text-gray-600">
        Test these elements on your iPhone (Safari & Chrome) to see how they respond
        outside the drag-and-drop context.
      </p>

      {/* Test 1: Simple Button */}
      <div className="border p-4 rounded-md shadow-sm">
        <h2 className="text-lg font-semibold mb-2">1. Simple Button</h2>
        <Button
          onClick={handleButtonClick}
          onTouchStart={handleButtonTouchStart}
          className="w-full touch-action-manipulation"
        >
          Test Simple Button
        </Button>
        <p className="text-xs text-gray-500 mt-2">
          Expected: Toast on tap. Should not scroll.
        </p>
      </div>

      {/* Test 2: Checkbox */}
      <div className="border p-4 rounded-md shadow-sm">
        <h2 className="text-lg font-semibold mb-2">2. Checkbox</h2>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="test-checkbox"
            checked={checkboxChecked}
            onCheckedChange={handleCheckboxChange}
            onClick={(e) => e.stopPropagation()} // Prevent potential parent drag
            onTouchStart={(e) => e.stopPropagation()} // Prevent potential parent drag
          />
          <label htmlFor="test-checkbox" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Test Checkbox
          </label>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Expected: Checkbox state changes, toast appears.
        </p>
      </div>

      {/* Test 3: Dropdown Menu Trigger (like TaskCard) */}
      <div className="border p-4 rounded-md shadow-sm">
        <h2 className="text-lg font-semibold mb-2">3. Dropdown Menu</h2>
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 touch-action-manipulation"
              onClick={handleDropdownTriggerClick}
              onTouchStart={handleDropdownTriggerTouchStart}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuLabel>Test Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toast.success("Dropdown Item 1 Clicked!")}>
              <Check className="mr-2 h-4 w-4" /> Item 1
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.success("Dropdown Item 2 Clicked!")}>
              Item 2
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <p className="text-xs text-gray-500 mt-2">
          Expected: Dropdown menu opens on tap.
        </p>
      </div>

      {/* Test 4: Draggable-like Area (to test touch-action: none) */}
      <div className="border p-4 rounded-md shadow-sm">
        <h2 className="text-lg font-semibold mb-2">4. Draggable-like Area</h2>
        <div
          className="bg-blue-100 h-24 flex items-center justify-center rounded-md text-blue-800 font-medium touch-action-none"
          onTouchStart={handleDraggableAreaTouchStart}
          onTouchMove={handleDraggableAreaTouchMove}
        >
          Try to scroll this area on iPhone
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Expected: This blue area should NOT scroll the page when you drag on it.
        </p>
      </div>
    </div>
  );
};

export default DevPage;