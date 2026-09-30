import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import prettier from 'eslint-config-prettier'

export default [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser }
    },
    rules: {
      // 页面组件统一命名为 index.vue
      'vue/multi-word-component-names': 'off',
      // 属性首行换行属于排版，交给 Prettier / 现有紧凑写法
      'vue/first-attribute-linebreak': 'off',
      // 解构剔除字段（const { a, ...rest } = obj）是有意为之
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none', ignoreRestSiblings: true }]
    }
  },
  {
    files: ['vite.config.js', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.node } }
  },
  {
    files: ['**/*.test.js'],
    languageOptions: { globals: { ...globals.node } }
  },
  // 放最后：关闭与 Prettier 冲突的格式类规则，格式交给 Prettier
  prettier
]
