import { describe, expect, test } from 'bun:test';
import {
	captureConsole,
	createDeferredPromise,
	createMockFn,
	createSpy,
	delay,
	expectToThrowAsync,
	waitForCondition,
} from './helpers';

describe('expectToThrowAsync', () => {
	test('should pass when function throws', async () => {
		await expectToThrowAsync(async () => {
			throw new Error('Test error');
		});
	});

	test('should match error message with string', async () => {
		await expectToThrowAsync(async () => {
			throw new Error('Test error message');
		}, 'Test error');
	});

	test('should match error message with regex', async () => {
		await expectToThrowAsync(async () => {
			throw new Error('Test error message');
		}, /error/);
	});

	test('should fail when function does not throw', async () => {
		let failed = false;
		try {
			await expectToThrowAsync(async () => {
				// Does not throw
			});
		} catch {
			failed = true;
		}
		expect(failed).toBe(true);
	});
});

describe('waitForCondition', () => {
	test('should resolve when condition is met immediately', async () => {
		await waitForCondition(() => true);
	});

	test('should resolve when condition becomes true', async () => {
		let counter = 0;
		await waitForCondition(() => {
			counter++;
			return counter > 2;
		});
		expect(counter).toBeGreaterThan(2);
	});

	test('should timeout when condition is never met', async () => {
		await expectToThrowAsync(async () => {
			await waitForCondition(() => false, 100);
		}, 'Condition not met within 100ms');
	});
});

describe('delay', () => {
	test('should delay execution', async () => {
		const start = Date.now();
		await delay(50);
		const elapsed = Date.now() - start;
		expect(elapsed).toBeGreaterThanOrEqual(45); // Small tolerance
	});
});

describe('createSpy', () => {
	test('should track function calls', () => {
		const spy = createSpy<[number, string], void>();
		spy(1, 'test');
		spy(2, 'test2');

		expect(spy.callCount).toBe(2);
		expect(spy.calls).toEqual([
			[1, 'test'],
			[2, 'test2'],
		]);
	});

	test('should support custom implementation', () => {
		const spy = createSpy((a: number, b: number) => a + b);
		const result = spy(1, 2);

		expect(result).toBe(3);
		expect(spy.callCount).toBe(1);
	});

	test('should support reset', () => {
		const spy = createSpy<[number], void>();
		spy(1);
		spy(2);
		expect(spy.callCount).toBe(2);

		spy.reset();
		expect(spy.callCount).toBe(0);
		expect(spy.calls).toEqual([]);
	});
});

describe('createMockFn', () => {
	test('should return values in order', () => {
		const mock = createMockFn('first', 'second', 'third');
		expect(mock()).toBe('first');
		expect(mock()).toBe('second');
		expect(mock()).toBe('third');
	});

	test('should throw when called more times than values', () => {
		const mock = createMockFn('only');
		mock();
		expect(() => mock()).toThrow('Mock function called more times than return values provided');
	});
});

describe('createDeferredPromise', () => {
	test('should allow manual resolution', async () => {
		const deferred = createDeferredPromise<string>();
		deferred.resolve('test');
		const result = await deferred.promise;
		expect(result).toBe('test');
	});

	test('should allow manual rejection', async () => {
		const deferred = createDeferredPromise<string>();
		deferred.reject(new Error('test error'));
		await expectToThrowAsync(async () => {
			await deferred.promise;
		}, 'test error');
	});
});

describe('captureConsole', () => {
	test('should capture console.log output', async () => {
		const { stdout, result } = await captureConsole(() => {
			console.log('test message');
			return 'return value';
		});

		expect(stdout).toEqual(['test message']);
		expect(result).toBe('return value');
	});

	test('should capture console.error output', async () => {
		const { stderr } = await captureConsole(() => {
			console.error('error message');
		});

		expect(stderr).toEqual(['error message']);
	});

	test('should capture console.warn output', async () => {
		const { stderr } = await captureConsole(() => {
			console.warn('warning message');
		});

		expect(stderr).toEqual(['warning message']);
	});

	test('should work with async functions', async () => {
		const { stdout, result } = await captureConsole(async () => {
			await delay(10);
			console.log('async message');
			return 42;
		});

		expect(stdout).toEqual(['async message']);
		expect(result).toBe(42);
	});

	test('should restore console after execution', async () => {
		const originalLog = console.log;
		await captureConsole(() => {
			console.log('test');
		});
		expect(console.log).toBe(originalLog);
	});

	test('should restore console even if function throws', async () => {
		const originalLog = console.log;
		try {
			await captureConsole(() => {
				throw new Error('test');
			});
		} catch {
			// Expected
		}
		expect(console.log).toBe(originalLog);
	});
});
