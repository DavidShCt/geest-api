const crypto = require('crypto');

function normalizeValue(value) {
    if (Array.isArray(value)) {
        return value.map(normalizeValue);
    }

    if (value !== null && typeof value === 'object') {
        return Object.keys(value)
            .sort()
            .reduce((result, key) => {
                result[key] = normalizeValue(value[key]);
                return result;
            }, {});
    }

    return value;
}

function createRequestHash(body) {
    const normalizedBody = normalizeValue(body);

    return crypto
        .createHash('sha256')
        .update(JSON.stringify(normalizedBody))
        .digest('hex');
}

module.exports = {
    createRequestHash
};