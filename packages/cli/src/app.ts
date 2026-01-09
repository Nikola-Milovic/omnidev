import { buildApplication, buildCommand, buildRouteMap } from '@stricli/core';

// Placeholder command - will be replaced in subsequent user stories
const placeholderCommand = buildCommand({
	docs: {
		brief: 'Placeholder command',
	},
	parameters: {},
	func() {
		console.log('OmniDev CLI - Commands coming soon');
	},
});

const app = buildApplication(
	buildRouteMap({
		routes: {
			_placeholder: placeholderCommand,
		},
		docs: {
			brief: 'OmniDev commands',
		},
	}),
	{
		name: 'omnidev',
		versionInfo: {
			currentVersion: '0.1.0',
		},
	},
);

export { app };
