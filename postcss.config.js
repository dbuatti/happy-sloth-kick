import postcssImport from 'postcss-import/index.js'; // Adjusted import path
import tailwindcssNesting from 'tailwindcss/nesting';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default {
  plugins: {
    'postcss-import': postcssImport, // Use the imported module
    'tailwindcss/nesting': tailwindcssNesting,
    tailwindcss: tailwindcss,
    autoprefixer: autoprefixer,
  },
};