module.exports = {
  adminApi: {
    input: {
      target: 'http://localhost:8080/api-docs',
    },
    output: {
      mode: 'tags-split',
      target: './src/api/generated/endpoints.ts',
      schemas: './src/api/generated/model',
      client: 'fetch',
      clean: true,
      prettier: true,
    },
  },
};
