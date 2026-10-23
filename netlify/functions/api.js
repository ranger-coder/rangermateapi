const serverless = require('serverless-http');
const app = require('../../server');

const handler = serverless(app);

module.exports.handler = async (event, context) => {
  // Prevent Lambda from waiting for an empty event loop due to persistent MongoDB connection
  context.callbackWaitsForEmptyEventLoop = false;

  // Ensure database is connected
  if (app.connectDB) {
    try {
      await app.connectDB();
    } catch (err) {
      console.error('[Netlify Function] Database connection error:', err);
    }
  }

  return await handler(event, context);
};
