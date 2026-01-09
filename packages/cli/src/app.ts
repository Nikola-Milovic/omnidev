import { buildApplication, buildRouteMap } from "@stricli/core";
import { doctorCommand } from "./commands/doctor";
import { initCommand } from "./commands/init";
import { serveCommand } from "./commands/serve";
import { capabilityRoutes } from "./commands/capability";
import { profileRoutes } from "./commands/profile";

const app = buildApplication(
	buildRouteMap({
		routes: {
			init: initCommand,
			doctor: doctorCommand,
			serve: serveCommand,
			capability: capabilityRoutes,
			profile: profileRoutes,
		},
		docs: {
			brief: "OmniDev commands",
		},
	}),
	{
		name: "omnidev",
		versionInfo: {
			currentVersion: "0.1.0",
		},
	},
);

export { app };
