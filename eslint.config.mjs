// @ts-check
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

const regraPoolGlobal = {
  name: 'pg',
  message:
    'RN-054t: nunca abra conexão/pool fora de src/db (bootstrap) ou src/contexto ' +
    '(UnidadeDeTrabalhoService). Todo acesso a dado passa pela transação do contexto atual ' +
    '(transacaoAtual()/UnidadeDeTrabalhoService.executar), nunca por uma conexão paralela.',
};

export default [
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { sourceType: 'module' },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      'no-restricted-imports': ['error', { paths: [regraPoolGlobal] }],
    },
  },
  {
    // Únicos lugares com permissão de abrir conexão/pool diretamente.
    files: ['src/db/**/*.ts', 'src/contexto/**/*.ts', 'test/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
];
