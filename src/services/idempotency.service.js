const {
    IdempotencyKey
} = require('../models');

const AppError = require('../utils/AppError');
const { createRequestHash } = require('../utils/hash');

function normalizeResponseBody(responseBody) {
    if (typeof responseBody === 'string') {
        try {
            return JSON.parse(responseBody);
        } catch (error) {
            return responseBody;
        }
    }

    return responseBody;
}

async function findExisting({
    key,
    method,
    route,
    requestHash
}) {
    const existing = await IdempotencyKey.findOne({
        where: {
            key,
            method,
            route
        }
    });

    if (!existing) {
        return null;
    }

    if (existing.requestHash !== requestHash) {
        throw new AppError(
            'IDEMPOTENCY_KEY_REUSED',
            'The Idempotency-Key was already used with a different request body.',
            409
        );
    }

    return existing;
}

async function getExistingResponse({
    key,
    method,
    route,
    requestHash
}) {
    const existing = await findExisting({
        key,
        method,
        route,
        requestHash
    });

    if (!existing) {
        return null;
    }

    /*
     * Si la operación todavía está en proceso,
     * responseBody será NULL.
     */
    if (
        existing.statusCode === null ||
        existing.responseBody === null
    ) {
        return null;
    }

    return {
        statusCode: existing.statusCode,
        responseBody: normalizeResponseBody(
            existing.responseBody
        )
    };
}

function getRequestHash(body) {
    return createRequestHash(body);
}

function sleep(milliseconds) {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
}

async function waitForCompletion({
    key,
    method,
    route,
    requestHash,
    timeout = 10000,
    interval = 50
}) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        const existing = await findExisting({
            key,
            method,
            route,
            requestHash
        });

        if (!existing) {
            return null;
        }

        if (
            existing.statusCode !== null &&
            existing.responseBody !== null
        ) {
            return {
                statusCode: existing.statusCode,
                responseBody: normalizeResponseBody(
                    existing.responseBody
                )
            };
        }

        await sleep(interval);
    }

    throw new AppError(
        'IDEMPOTENCY_TIMEOUT',
        'The original request is still being processed.',
        409
    );
}

module.exports = {
    findExisting,
    getExistingResponse,
    getRequestHash,
    normalizeResponseBody,
    waitForCompletion
};