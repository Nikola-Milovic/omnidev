import { buildApplication, buildRouteMap } from '@stricli/core';
import { initCommand } from './commands/init';

const app = buildApplication(
	buildRouteMap({
		routes: {
			init: initCommand,
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
