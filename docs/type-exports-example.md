# Type Exports for Capability Developers

## Overview

All capability export types are available from `@omnidev/core`. This provides TypeScript developers with autocompletion, type checking, and inline documentation.

## Available Types

### Core Export Types

```typescript
import type {
  CapabilityExport,    // Main capability export interface
  SkillExport,         // Skill definition structure
  DocExport,           // Documentation structure
  FileContent,         // File name and content pair
  McpToolExport        // MCP tool definition
} from "@omnidev/core";
```

### Type Definitions

#### CapabilityExport

```typescript
interface CapabilityExport {
  cliCommands?: Record<string, unknown>;
  mcpTools?: Record<string, McpToolExport>;
  docs?: DocExport[];
  rules?: string[];
  skills?: SkillExport[];
  gitignore?: string[];
  sync?: () => Promise<void>;
  [key: string]: unknown;
}
```

#### SkillExport

```typescript
interface SkillExport {
  skillMd: string;
  references?: FileContent[];
  additionalFiles?: FileContent[];
}
```

#### DocExport

```typescript
interface DocExport {
  title: string;
  content: string;
}
```

#### FileContent

```typescript
interface FileContent {
  name: string;
  content: string;
}
```

## Usage Examples

### Basic Usage

```typescript
import type { CapabilityExport } from "@omnidev/core";
import { myRoutes } from "./cli.js";

export default {
  cliCommands: {
    mycap: myRoutes
  },
  gitignore: ["mycap/"]
} satisfies CapabilityExport;
```

### With Skills

```typescript
import type { CapabilityExport, SkillExport } from "@omnidev/core";

const mySkill: SkillExport = {
  skillMd: `---
name: my-skill
description: "Do something useful"
---

# My Skill

Instructions here...`,
  references: [
    {
      name: "template.md",
      content: "# Template\n\nSome template content..."
    }
  ]
};

export default {
  cliCommands: { mycap: myRoutes },
  skills: [mySkill],
  gitignore: ["mycap/"]
} satisfies CapabilityExport;
```

### With Documentation

```typescript
import type { CapabilityExport, DocExport } from "@omnidev/core";

const docs: DocExport[] = [
  {
    title: "Getting Started",
    content: "# Getting Started\n\nFollow these steps..."
  },
  {
    title: "Advanced Usage",
    content: "# Advanced Usage\n\nFor power users..."
  }
];

export default {
  cliCommands: { mycap: myRoutes },
  docs,
  gitignore: ["mycap/"]
} satisfies CapabilityExport;
```

### Full Example

```typescript
import type {
  CapabilityExport,
  SkillExport,
  DocExport,
  FileContent
} from "@omnidev/core";
import { deployRoutes } from "./cli.js";
import { sync } from "./sync.js";

// Helper function to generate config file
function generateConfig(env: string): FileContent {
  return {
    name: `config.${env}.json`,
    content: JSON.stringify({ environment: env }, null, 2)
  };
}

// Define documentation programmatically
const docs: DocExport[] = [
  {
    title: "Deployment Guide",
    content: `# Deployment Guide

## Overview

This guide covers deployment to various environments...`
  }
];

// Define skills programmatically
const skills: SkillExport[] = [
  {
    skillMd: `---
name: deploy
description: "Deploy to production"
---

# Deploy Skill

Automates the deployment process...`,
    references: [
      generateConfig("production"),
      {
        name: "deploy.sh",
        content: "#!/bin/bash\necho 'Deploying...'"
      }
    ]
  }
];

// Export everything
export default {
  cliCommands: {
    deploy: deployRoutes
  },

  docs,

  rules: [
    `# Deployment Rules

Before deploying:
- Ensure all tests pass
- Update changelog
- Tag release`
  ],

  skills,

  gitignore: [
    "deploy/logs/",
    "*.deploy.tmp"
  ],

  sync
} satisfies CapabilityExport;

// Named exports for programmatic usage
export { getDeploymentStatus } from "./api.js";
```

## Benefits of Using Types

### 1. Type Safety

```typescript
export default {
  // ❌ TypeScript error: 'command' should be 'cliCommands'
  command: { mycap: myRoutes }
} satisfies CapabilityExport;
```

### 2. Autocompletion

Your IDE will suggest available fields when you type:

```typescript
export default {
  cli  // ← IDE suggests: cliCommands, gitignore, skills, docs, etc.
```

### 3. Inline Documentation

Hover over fields to see their documentation:

```typescript
export default {
  gitignore:  // ← IDE shows: "Gitignore patterns"
```

### 4. Catch Errors Early

```typescript
export default {
  skills: [
    {
      // ❌ TypeScript error: Missing required property 'skillMd'
      references: []
    }
  ]
} satisfies CapabilityExport;
```

## For JavaScript Users

If you're not using TypeScript, you can still benefit from JSDoc comments:

```javascript
/**
 * @type {import("@omnidev/core").CapabilityExport}
 */
export default {
  cliCommands: {
    mycap: myRoutes
  }
};
```

This provides type checking and autocompletion in VS Code and other editors with TypeScript support.
