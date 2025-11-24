import express, { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import expressWinston from 'express-winston';
import helmet from 'helmet';
import routes from './routes';
import swaggerDocument from './docs';
import { requestHandler, errorHandler, requestLogger } from './middlewares';

const app: Express = express();

app.use(helmet());

app.use(express.json());

// Configuração de CORS para aceitar múltiplas origens
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://devs-impacto.vercel.app',
  process.env.FRONTEND_URL, // URL configurável via .env
].filter(Boolean); // Remove valores undefined/null

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite requisições sem origin (mobile apps, Postman, etc)
      if (!origin) return callback(null, true);
      
      // Verifica se a origem está na lista permitida
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`⚠️ CORS bloqueado para origem: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Permite cookies/autenticação
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-webhook-signature'],
  }),
);

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(
  expressWinston.logger({ winstonInstance: requestLogger, statusLevels: true }),
);
expressWinston.requestWhitelist.push('body');
expressWinston.responseWhitelist.push('body');
app.use(routes);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(errorHandler);
app.use(requestHandler);
app.use(expressWinston.errorLogger({ winstonInstance: requestLogger }));

export default app;
