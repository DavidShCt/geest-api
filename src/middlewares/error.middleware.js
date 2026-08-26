const {
    ValidationError,
    UniqueConstraintError
} = require('sequelize');

function errorMiddleware(err, req, res, next) {

    console.error(err);

    if (err.name === 'AppError') {

        return res.status(err.statusCode).json({
            error: {
                code: err.code,
                message: err.message
            }
        });
    }

    if (err instanceof ValidationError) {

        const validationError = err.errors?.[0];

        if (
            validationError &&
            validationError.validatorKey === 'isEmail'
        ) {

            return res.status(400).json({
                error: {
                    code: 'INVALID_EMAIL',
                    message: 'The email address is not valid.'
                }
            });
        }

        return res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: validationError?.message || 'Validation error.'
            }
        });
    }

    if (err instanceof UniqueConstraintError) {

        return res.status(409).json({
            error: {
                code: 'DUPLICATE_RESOURCE',
                message: 'A resource with the provided information already exists.'
            }
        });
    }

    return res.status(500).json({
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred.'
        }
    });
}

module.exports = errorMiddleware;