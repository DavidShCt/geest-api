const express = require('express');

const userRoutes = require('./routes/user.routes');
const taskRoutes = require('./routes/task.routes');
const errorMiddleware = require('./middlewares/error.middleware');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok'
    });
});

app.use('/users', userRoutes);
app.use('/tasks', taskRoutes);

app.use(errorMiddleware);

module.exports = app;