<a href="https://www.opendocuchat.com">
  <img src="./public/image/logo.svg" width="96px" alt="OpenDocuChat logo" />
</a>

# Open-source AI chatbot for technical documentation websites

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fopendocuchat%2Fopendocuchat.git&project-name=opendocuchat&repository-name=opendocuchat&integration-ids=oac_PGzKMq4GfxF6TOqZfpFdrTXN&stores=%5B%7B%22type%22%3A%22postgres%22%2C%22envVarPrefix%22%3A%22MY_WEB%22%7D%5D)


### TODO

1. Set up the following project structure

```mermaid
graph TD
    A[Project Root] --> B[src]
    A --> C[public]
    A --> D[package.json]
    A --> E[next.config.js]
    A --> F[tsconfig.json]
    A --> G[README.md]
    A --> J[database-migrations]
    B --> H[app]
    B --> I[components]
    H --> L[api]
    H --> M[page.tsx]
    H --> N[widget]
    C --> T[widget-loader.js]
    B --> U[lib]
    N --> V[page.tsx]
```

2. Set up database migrations. Custom function, support only up migrations, save status in a table in a schema. Read migrations from a folder. Example migration file name: `00001-create-data-source-table.sql`.

3. Test Together AI / Replica AI setup

Later
- set up auth.js
    - automate saving auth.js secret to vercel using: vercel env add AUTH_SECRET production < <(grep AUTH_SECRET .env.local | sed -n 's/.*="\([^"]*\)".*/\1/p' | tr -d '\n')
- Automate local dev setup: make auto-generated Together AI env var also available in dev environment (is prod and stag per default). E.g. make post-deploy script running vercel link & vercel env pull --environment=Production

