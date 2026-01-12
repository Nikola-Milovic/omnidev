import { describe, it, expect } from "bun:test";
import { findFreePort } from "./net";

describe("findFreePort", () => {
	it("should find a free port starting from 10000", async () => {
		const port = await findFreePort(10000, 10);
		expect(port).toBeGreaterThanOrEqual(10000);
		expect(port).toBeLessThan(10010);
	});

	it("should find consecutive free ports", async () => {
		const port1 = await findFreePort(10500, 5);
		const port2 = await findFreePort(10500, 5);

		// Both should find a port, but might be the same or different
		// depending on test timing
		expect(port1).toBeGreaterThanOrEqual(10500);
		expect(port2).toBeGreaterThanOrEqual(10500);
	});

	it("should throw error when no free port found", async () => {
		// Reserve a port first
		const server = Bun.serve({
			port: 20000,
			fetch() {
				return new Response("OK");
			},
		});

		try {
			await expect(findFreePort(20000, 1)).rejects.toThrow("No free port found in range");
		} finally {
			server.stop();
		}
	});
});
