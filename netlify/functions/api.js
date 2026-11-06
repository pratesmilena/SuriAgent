const serverless = require('serverless-http');
const { isIP } = require('node:net');
const { createApp } = require('../../app');
const app = createApp({ platform: 'netlify' });
const serve = serverless(app);

exports.handler = (event, context) => {
    // Netlify supplies the actual client IP in this platform header.
    // Do not trust arbitrary X-Forwarded-For values for rate-limit identity.
    const headers = event.headers || {};
    const ip = headers['x-nf-client-connection-ip'] || headers['X-Nf-Client-Connection-Ip'];
    const requestContext = { ...event.requestContext };
    if (ip && isIP(ip)) requestContext.identity = { ...requestContext.identity, sourceIp: ip };
    const prefix = '/.netlify/functions/api';
    let path = event.path || '/';
    // Support both Netlify's rewritten path and the direct function URL.
    if (path === prefix || path.startsWith(prefix + '/')) {
        path = '/api' + path.slice(prefix.length);
    }
    return serve({ ...event, path, requestContext }, context);
};
