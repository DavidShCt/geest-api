const {
    Notification
} = require('../models');

const MAX_ATTEMPTS = 3;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendNotification({
    taskId,
    title,
    archivedAt
}) {

    const notifyUrl = process.env.NOTIFY_URL;

    if (!notifyUrl) {
        throw new Error('NOTIFY_URL is not configured.');
    }

    const payload = {
        taskId,
        title,
        archivedAt: archivedAt.toISOString()
    };

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {

        let statusCode = null;

        try {

            const response = await fetch(
                notifyUrl,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                }
            );

            statusCode = response.status;

            await Notification.create({
                taskId,
                attempt,
                statusCode,
                attemptedAt: new Date()
            });

            /*
             * Solo reintentamos cuando el destino responde
             * con un error 5xx.
             */
            if (statusCode < 500 || statusCode >= 600) {
                return;
            }

        } catch (error) {

            /*
             * Si no hubo respuesta, statusCode queda en null.
             */
            await Notification.create({
                taskId,
                attempt,
                statusCode: null,
                attemptedAt: new Date()
            });
        }

        /*
         * Si todavía quedan intentos,
         * esperamos un tiempo creciente.
         *
         * Intento 1 -> 100 ms
         * Intento 2 -> 200 ms
         */
        if (attempt < MAX_ATTEMPTS) {
            await sleep(attempt * 100);
        }
    }
}

module.exports = {
    sendNotification
};