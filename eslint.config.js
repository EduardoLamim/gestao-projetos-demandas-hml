import js from '@eslint/js'
import ts from 'typescript-eslint'
import hooks from 'eslint-plugin-react-hooks'

export default ts.config(
  { ignores: ['node_modules/**', 'dist/**', '.codex/**', 'graphify-out/**', 'playwright-report/**', 'test-results/**'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  { files: ['scripts/**/*.mjs'], languageOptions: { globals: { process: 'readonly', fetch: 'readonly', AbortSignal: 'readonly', console: 'readonly' } } },
  { files: ['supabase/functions/**/*.ts'], languageOptions: { globals: { Deno: 'readonly', Request: 'readonly', Response: 'readonly' } } },
  { files: ['src/**/*.{ts,tsx}'], plugins: { 'react-hooks': hooks }, rules: hooks.configs.recommended.rules },
)
