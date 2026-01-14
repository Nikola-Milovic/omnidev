/**
 * Debug logger that writes to stdout when OMNIDEV_DEBUG=1
 */
export function debug(message: string, data?: unknown): void {
	if (process.env["OMNIDEV_DEBUG"] !== "1") {
		return;
	}

	const timestamp = new Date().toISOString();
	let logLine: string;

	if (data !== undefined) {
		logLine = `[${timestamp}] [omnidev] ${message} ${JSON.stringify(data, null, 2)}`;
	} else {
		logLine = `[${timestamp}] [omnidev] ${message}`;
	}

	// Write to stdout
	console.log(logLine);
}
