import { describe, expect, test } from 'bun:test';
import { createMockCapability, createMockConfig, createMockRule, createMockSkill } from './mocks';

describe('createMockCapability', () => {
	test('should create a mock capability with default values', () => {
		const capability = createMockCapability();
		expect(capability.id).toBe('test-capability');
		expect(capability.name).toBe('Test Capability');
		expect(capability.version).toBe('1.0.0');
		expect(capability.enabled).toBe(true);
	});

	test('should allow overriding default values', () => {
		const capability = createMockCapability({
			id: 'custom-id',
			name: 'Custom Name',
			version: '2.0.0',
			enabled: false,
		});
		expect(capability.id).toBe('custom-id');
		expect(capability.name).toBe('Custom Name');
		expect(capability.version).toBe('2.0.0');
		expect(capability.enabled).toBe(false);
	});
});

describe('createMockConfig', () => {
	test('should create a mock config with default values', () => {
		const config = createMockConfig();
		expect(config.project).toBe('test-project');
		expect(config.capabilities.enable).toEqual([]);
		expect(config.capabilities.disable).toEqual([]);
	});

	test('should allow overriding default values', () => {
		const config = createMockConfig({
			project: 'custom-project',
			capabilities: {
				enable: ['cap1', 'cap2'],
			},
		});
		expect(config.project).toBe('custom-project');
		expect(config.capabilities.enable).toEqual(['cap1', 'cap2']);
	});
});

describe('createMockSkill', () => {
	test('should create a mock skill with default values', () => {
		const skill = createMockSkill();
		expect(skill.id).toBe('test-skill');
		expect(skill.name).toBe('Test Skill');
		expect(skill.description).toBe('A test skill for unit testing');
		expect(skill.instructions).toBe('Test instructions');
	});

	test('should allow overriding default values', () => {
		const skill = createMockSkill({
			id: 'custom-skill',
			triggers: ['trigger1', 'trigger2'],
		});
		expect(skill.id).toBe('custom-skill');
		expect(skill.triggers).toEqual(['trigger1', 'trigger2']);
	});
});

describe('createMockRule', () => {
	test('should create a mock rule with default values', () => {
		const rule = createMockRule();
		expect(rule.id).toBe('test-rule');
		expect(rule.name).toBe('Test Rule');
		expect(rule.content).toBe('# Test Rule\n\nTest rule content');
		expect(rule.priority).toBe(1);
	});

	test('should allow overriding default values', () => {
		const rule = createMockRule({
			id: 'custom-rule',
			priority: 10,
		});
		expect(rule.id).toBe('custom-rule');
		expect(rule.priority).toBe(10);
	});
});
