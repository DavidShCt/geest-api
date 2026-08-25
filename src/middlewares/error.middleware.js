const { ValidationError, UniqueConstraintError, SequelizeValidationError, SequelizeUniqueConstraintError } = require('sequelize');

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
        return res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: err.errors[0].message
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

    if (err instanceof SequelizeValidationError) {
        return res.status(400).json({
            error: {
                code: 'INVALID_EMAIL',
                message: 'The email address is not valid.'
            }
        });
    }

    if (err instanceof SequelizeUniqueConstraintError) {
        return res.status(400).json({
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