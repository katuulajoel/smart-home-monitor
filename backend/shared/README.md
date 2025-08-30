# @smart-home/shared

Shared utilities and middleware for the Smart Home Energy Monitor services.

## Features

- **Authentication Middleware**: JWT-based authentication and authorization
- **Error Handling**: Consistent error handling and formatting
- **Request Validation**: Common validation middleware and utilities
- **Logging**: Configurable logging with Winston
- **Common Types**: Shared TypeScript interfaces and types

## Usage

### Authentication

```typescript
import { authenticate, authorize } from '@smart-home/shared';

// Protect a route with authentication
router.get('/protected', authenticate, (req, res) => {
  // Access the authenticated user
  console.log(req.user);
  res.json({ message: 'Authenticated route' });
});

// Protect a route with role-based authorization
router.get('/admin', 
  authenticate, 
  authorize(['admin']), 
  (req, res) => {
    res.json({ message: 'Admin route' });
  }
);
```

### Error Handling

```typescript
import { errorHandler, AppError } from '@smart-home/shared';

// In your Express app
app.use(errorHandler);

// Throwing errors
throw new AppError('Something went wrong', 400);
```

### Request Validation

```typescript
import { validate, validateRequest, dateRangeValidations } from '@smart-home/shared';

router.get('/data', 
  [
    ...dateRangeValidations,
    // Add more validations as needed
  ],
  validateRequest,
  (req, res) => {
    // Handle valid request
  }
);
```

## Development

### Building

```bash
npm run build
```

### Publishing

1. Update the version in `package.json`
2. Commit and push changes
3. Create a git tag for the version
4. Push the tag to trigger CI/CD

## License

MIT
