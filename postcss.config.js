import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import postcssImport from 'postcss-import';
import tailwindcssNesting from 'tailwindcss/nesting';

export default {
  plugins: {
    'postcss-import': postcssImport,
    'tailwindcss/nesting': tailwindcssNesting,
    tailwindcss: tailwindcss,
    autoprefixer: autoprefixer,
  },
};