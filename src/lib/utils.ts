import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Function to determine if a color is light or dark for contrast text
export function getContrastTextColor(hexcolor: string): 'text-white' | 'text-black' {
  if (!hexcolor || hexcolor.length < 7) return 'text-black'; // Default for invalid or transparent

  const r = parseInt(hexcolor.substring(1, 3), 16);
  const g = parseInt(hexcolor.substring(3, 5), 16);
  const b = parseInt(hexcolor.substring(5, 7), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? 'text-black' : 'text-white';
}