import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../../package.json';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart Home Energy Monitor - Auth Service API',
      version,
      description: 'API documentation for the Authentication Service',
    },
    servers: [
      {
        url: `http://localhost:${process.env.AUTH_SERVICE_PORT || 3001}/api`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const specs = swaggerJsdoc(options);
