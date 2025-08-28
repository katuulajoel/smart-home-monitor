import { type Request, type Response, type NextFunction } from 'express';
import { validationResult, type ValidationChain, ValidationError } from 'express-validator';
import { AppError } from '../utils/errors';

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      await Promise.all(validations.map((validation) => validation.run(req)));

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((err: ValidationError) => ({
          field: (err as any).path || 'unknown',
          message: err.msg,
          value: (err as any).value,
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
