const {
    Notification
} = require('../models');

const MAX_ATTEMPTS = 3;
const DEFAULT_TIMEOUT_MS = 2000;

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

    const timeoutMs =
        Number(process.env.NOTIFY_TIMEOUT_MS) ||
        DEFAULT_TIMEOUT_MS;

    const payload = {

        taskId,
        title,
        archivedAt: archivedAt.toISOString()

    };

    for (
        let attempt = 1;
        attempt <= MAX_ATTEMPTS;
        attempt++
    ) {

        let statusCode = null;

        const controller = new AbortController();

        const timeout = setTimeout(() => {

            controller.abort();

        }, timeoutMs);

        try {

            const response = await fetch(
                notifyUrl,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal
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
             * Solo reintentamos cuando el destino
             * responde con un error 5xx.
             */
            if (
                statusCode < 500 ||
                statusCode >= 600
            ) {

                return;

            }

        } catch (error) {

            /*
             * Error de red, timeout o ausencia
             * de respuesta.
             */
            await Notification.create({
                taskId,
                attempt,
                statusCode: null,
                attemptedAt: new Date()
            });

        } finally {

            clearTimeout(timeout);

        }

        /*
         * Espera incremental entre intentos.
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