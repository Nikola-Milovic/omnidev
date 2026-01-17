# TypeScript Best Practices

When writing TypeScript code, follow these guidelines:

- Use strict mode (`"strict": true` in tsconfig.json)
- Prefer `const` over `let`, avoid `var`
- Use explicit return types for public functions
- Avoid `any` - use `unknown` for truly dynamic values
- Use interfaces for object shapes, types for unions/primitives
- Enable `noUncheckedIndexedAccess` for safer array/object access
