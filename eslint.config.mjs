import globals from 'globals'

import path from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'
import pluginJs from '@eslint/js'

// mimic CommonJS variables -- not needed if using CommonJS
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({ baseDirectory: __dirname, recommendedConfig: pluginJs.configs.recommended })

export default [
  { languageOptions: { globals: globals.node } },
  ...compat.extends('standard'),
  rules, {
    'vue/multi-word-component-names': 'off',
    indent: 'off',
    'prettier/prettier': 'off',
    'space-before-function-paren': 'off',
    'no-unused-vars': 'off',
    'generator-star-spacing': 'off',
    'arrow-parens': 'off',
    'one-var': 'off',
    'comma-dangle': 'off',
    'vue/no-multiple-template-root': 'off',
    'vue/return-in-computed-property': 'off'
  },  // eslint-disable 警告不會回報
  reportUnusedDisableDirectives, true
]
