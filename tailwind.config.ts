import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        bubbly: ['Fredoka', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        'status-overdue': 'hsl(var(--destructive))',
        'status-due-today': 'hsl(var(--accent))',
        'status-completed': 'hsl(var(--status-completed))',
        'priority-low': 'hsl(var(--priority-low))',
        'priority-medium': 'hsl(var(--priority-medium))',
        'priority-high': 'hsl(var(--priority-high))',
        'priority-urgent': 'hsl(var(--priority-urgent))',
        'border-status-due-today': 'hsl(var(--border-status-due-today))',
        'border-status-overdue': 'hsl(var(--border-status-overdue))',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        '2xl': '1.5rem',
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'DEFAULT': 'var(--shadow)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
  safelist: [
    // Explicitly safelist theme classes
    'theme-ocean-breeze',
    'theme-sunset-glow',
    'theme-forest-deep',
    'theme-midnight-serenity',
    'theme-desert-bloom',
    // Safelist common color utility classes for each theme
    {
      pattern: /(bg|text|border)-(primary|secondary|accent|muted|destructive|card|popover|foreground|background)/,
      variants: ['dark', 'theme-ocean-breeze', 'theme-sunset-glow', 'theme-forest-deep', 'theme-midnight-serenity', 'theme-desert-bloom'],
    },
    {
      pattern: /(bg|text|border)-(priority-low|priority-medium|priority-high|priority-urgent|status-overdue|status-due-today|status-completed)/,
      variants: ['dark', 'theme-ocean-breeze', 'theme-sunset-glow', 'theme-forest-deep', 'theme-midnight-serenity', 'theme-desert-bloom'],
    },
    {
      pattern: /from-\[hsl\(var\(--gradient-start-(light|dark)\)\)\]/,
      variants: ['dark', 'theme-ocean-breeze', 'theme-sunset-glow', 'theme-forest-deep', 'theme-midnight-serenity', 'theme-desert-bloom'],
    },
    {
      pattern: /to-\[hsl\(var\(--gradient-end-(light|dark)\)\)\]/,
      variants: ['dark', 'theme-ocean-breeze', 'theme-sunset-glow', 'theme-forest-deep', 'theme-midnight-serenity', 'theme-desert-bloom'],
    },
  ],
} satisfies Config;