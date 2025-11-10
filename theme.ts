export interface Theme {
  name: string;
  gradient: string;      // For titles and logo
  bg: string;           // Primary background color for buttons
  bgHover: string;      // Hover background for buttons
  text: string;         // Primary text color for links
  // Fix: Add missing textHover property to support themed hover states.
  textHover: string;    // Hover text color for links/buttons
  textMuted: string;    // Lighter text color for accents (like radio buttons)
  // Fix: Add missing radio property to support themed radio buttons.
  radio: string;        // Color for checked radio buttons
  border: string;       // Primary border color
  borderHover: string;  // Hover border for cards, inputs etc.
  focusRing: string;    // Focus ring for inputs and buttons
  activeBg: string;     // Background for active items (like API keys)
}

export const themes: Record<string, Theme> = {
  teal: { 
    name: 'Xanh Dương', 
    gradient: 'from-blue-400 to-teal-400',
    bg: 'bg-teal-600',
    bgHover: 'hover:bg-teal-700',
    text: 'text-teal-400',
    textHover: 'hover:text-teal-400',
    textMuted: 'text-teal-500',
    radio: 'text-teal-500',
    border: 'border-teal-500',
    borderHover: 'hover:border-teal-400',
    focusRing: 'focus:ring-teal-500',
    activeBg: 'bg-teal-900/70',
  },
  green: { 
    name: 'Xanh Lá', 
    gradient: 'from-green-400 to-emerald-500',
    bg: 'bg-emerald-600',
    bgHover: 'hover:bg-emerald-700',
    text: 'text-emerald-400',
    textHover: 'hover:text-emerald-400',
    textMuted: 'text-emerald-500',
    radio: 'text-emerald-500',
    border: 'border-emerald-500',
    borderHover: 'hover:border-emerald-400',
    focusRing: 'focus:ring-emerald-500',
    activeBg: 'bg-emerald-900/70',
  },
  red: { 
    name: 'Đỏ', 
    gradient: 'from-red-500 to-rose-500',
    bg: 'bg-red-600',
    bgHover: 'hover:bg-red-700',
    text: 'text-red-400',
    textHover: 'hover:text-red-400',
    textMuted: 'text-red-500',
    radio: 'text-red-500',
    border: 'border-red-500',
    borderHover: 'hover:border-red-400',
    focusRing: 'focus:ring-red-500',
    activeBg: 'bg-red-900/70',
  },
  orange: { 
    name: 'Cam', 
    gradient: 'from-orange-400 to-amber-500',
    bg: 'bg-orange-500',
    bgHover: 'hover:bg-orange-600',
    text: 'text-orange-400',
    textHover: 'hover:text-orange-400',
    textMuted: 'text-orange-500',
    radio: 'text-orange-500',
    border: 'border-orange-500',
    borderHover: 'hover:border-orange-400',
    focusRing: 'focus:ring-orange-500',
    activeBg: 'bg-orange-900/70',
  },
  purple: { 
    name: 'Tím', 
    gradient: 'from-purple-500 to-violet-500',
    bg: 'bg-violet-600',
    bgHover: 'hover:bg-violet-700',
    text: 'text-violet-400',
    textHover: 'hover:text-violet-400',
    textMuted: 'text-violet-500',
    radio: 'text-violet-500',
    border: 'border-violet-500',
    borderHover: 'hover:border-violet-400',
    focusRing: 'focus:ring-violet-500',
    activeBg: 'bg-violet-900/70',
  },
};
