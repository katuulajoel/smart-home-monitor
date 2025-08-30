import { type Request, type Response, type NextFunction } from 'express';
import { AppError } from '../utils/errors';

const { validationResult } = require('express-validator');

export const validate = (validations: any[]) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      await Promise.all(validations.map((validation: any) => validation.run(req)));

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((err: any) => ({
          field: err.path || err.param || 'unknown',
          message: err.msg,
          value: err.value,
        }));

        const error = new AppError('Validation failed');
        error.statusCode = 400;
        error.data = { errors: errorMessages };
        return next(error);
      }
      return next();
    } catch (e) {
      return next(e as Error);
    }
  };
};

export default {
  validate,
};