/**
 * @file server/utils/portFinder.js
 * @description Dynamic port detection utility finding available HTTP server ports with automatic fallback.
 * @module PortFinder
 * @dependencies net
 * @author Agent Architecture Directive
 */

const net = require('net');

/**
 * Searches for an available TCP port starting from preferredPort.
 * If preferredPort is in use (EADDRINUSE), auto-increments until a free port is found.
 * @param {number} preferredPort Initial port to check
 * @param {number} maxAttempts Maximum increment attempts (default: 50)
 * @returns {Promise<number>} Available port number
 */
function findAvailablePort(preferredPort = 3000, maxAttempts = 50) {
  const initial = parseInt(preferredPort, 10) || 3000;

  return new Promise((resolve, reject) => {
    let currentPort = initial;
    let attempts = 0;

    function testPort(port) {
      const server = net.createServer();

      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          attempts++;
          if (attempts >= maxAttempts) {
            return reject(new Error(`Could not find an available port after ${maxAttempts} attempts starting from ${initial}`));
          }
          console.warn(`[PortFinder] Port ${port} is currently in use. Auto-detecting next available port (${port + 1})...`);
          testPort(port + 1);
        } else {
          reject(err);
        }
      });

      server.once('listening', () => {
        server.close(() => {
          resolve(port);
        });
      });

      server.listen(port);
    }

    testPort(currentPort);
  });
}

module.exports = {
  findAvailablePort
};
