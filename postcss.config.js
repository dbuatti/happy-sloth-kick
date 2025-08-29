import postcssImport from 'postcss-import/index.js';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const config = {
  plugins: [
    postcssImport(),
    tailwindcss(),
    autoprefixer,
  ],
};

export default config;