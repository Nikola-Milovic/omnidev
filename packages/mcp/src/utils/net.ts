/**
 * Network utilities for OmniDev
 */

/**
 * Find a free port starting from the given port number.
 * Tries each port sequentially until one is available.
 *
 * @param startPort - Starting port number (default: 10000)
 * @param maxTries - Maximum number of ports to try (default: 100)
 * @returns Promise resolving to the first available port
 * @throws Error if no free port is found after maxTries attempts
 */
export async function findFreePort(startPort = 10000, maxTries = 100): Promise<number> {
	for (let i = 0; i < maxTries; i++) {
		const port = startPort + i;

		try {
			// Try to create a server on this port
			const server = Bun.serve({
				port,
				fetch() {
					return new Response("OK");
				},
			});

			// If we got here, the port is available
			// Immediately stop the test server
			server.stop();

			return port;
		} catch (error) {
			// Port is in use, try the next one
			const errorMessage = error instanceof Error ? error.message : String(error);
			if (
				!errorMessage.includes("EADDRINUSE") &&
				!errorMessage.includes("already in use") &&
				!errorMessage.includes("in use")
			) {
				// If it's not a "port in use" error, rethrow
				throw error;
			}
			// Continue to next port
		}
	}

	throw new Error(`No free port found in range ${startPort}-${startPort + maxTries - 1}`);
}
