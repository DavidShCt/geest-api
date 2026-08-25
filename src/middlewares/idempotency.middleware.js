const {
    findExisting,
    getRequestHash,
    waitForCompletion,
    normalizeResponseBody
} = require('../services/idempotency.service');

const AppError = require('../utils/AppError');

async function idempotencyMiddleware(req, res, next) {
    const idempotencyKey = req.get('Idempotency-Key');

    if (!idempotencyKey || !idempotencyKey.trim()) {
        return next(
            new AppError(
                'IDEMPOTENCY_KEY_REQUIRED',
                'The Idempotency-Key header is required.',
                400
            )
        );
    }

    const key = idempotencyKey.trim();
    const requestHash = getRequestHash(req.body || {});

    const method = req.method;
    const route = req.baseUrl + req.path;

    try {
        const existing = await findExisting({
            key,
            method,
            route,
            requestHash
        });

        if (existing) {
            if (
                existing.statusCode !== null &&
                existing.responseBody !== null
            ) {
                return res
                    .status(existing.statusCode)
                    .json(
                        normalizeResponseBody(existing.responseBody)
                    );
            }
        
            const result = await waitForCompletion({
                key,
                method,
                route,
                requestHash
            });
        
            if (result) {
                return res
                    .status(result.statusCode)
                    .json(result.responseBody);
            }
        }

        req.idempotency = {
            key,
            method,
            route,
            requestHash
        };

        next();
    } catch (error) {
        next(error);
    }
}

module.exports = idempotencyMiddleware;