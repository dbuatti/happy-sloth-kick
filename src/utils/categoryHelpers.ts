export const getCategoryColorProps = (color: string) => {
  // This is a placeholder. You can expand this to map colors to Tailwind classes or specific hex values.
  // For now, it just returns the color as both background and text color.
  // In a real app, you might have a predefined palette.
  return {
    bgColor: color,
    textColor: color, // Or a contrasting color like 'white' or 'black' based on background
  };
};