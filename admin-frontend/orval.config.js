module.exports = {
  adminApi: {
    input: {
      target: 'http://localhost:8080/api-docs',
    },
    output: {
      mode: 'tags-split',
      target: './src/api/generated/endpoints.ts',
      schemas: './src/api/generated/model',
      client: 'axios',
      clean: true,
      prettier: true,
      baseUrl: '',
      override: {
        mutator: {
          path: './src/api/custom-instance.ts',
          name: 'customInstance',
        },
      },
    },
  },
};
