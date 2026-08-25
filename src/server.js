require('dotenv').config();

const app = require('./app');
const sequelize = require('./config/database');

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await sequelize.authenticate();

        console.log('Database connection established successfully.');

        app.listen(PORT, () => {
            console.log(`GEEST API running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
}

startServer();