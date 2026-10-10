# @suryasaathi/policies

[Cedar](https://www.cedarpolicy.com) schema and policies for consent and access, checked before
every agent tool call. Tests run the policies through `@cedar-policy/cedar-wasm`.

- `policies/schema.cedarschema` — entity types and actions
- `policies/access.cedar` — access rules (empty for now: Cedar denies by default)

```bash
pnpm --filter @suryasaathi/policies test
```
