<a href="https://www.opendocuchat.com">
  <img src="./public/image/logo.svg" width="64px" alt="OpenDocuChat logo" />
</a>

<br>

# Open-source AI chat for technical product promotion

<br>

Explain&nbsp;products&nbsp;to&nbsp;website&nbsp;visitors&nbsp;&nbsp;·&nbsp; Explain&nbsp;technical&nbsp;terms&nbsp;&nbsp;·&nbsp; Answer&nbsp;technical&nbsp;questions&nbsp;&nbsp;·&nbsp; Direct&nbsp;users&nbsp;to&nbsp;the&nbsp;right&nbsp;product&nbsp;&nbsp;·&nbsp; Direct&nbsp;visitors&nbsp;to&nbsp;sales&nbsp;people&nbsp;&nbsp;·&nbsp; Boost&nbsp;page&nbsp;engagement&nbsp;&nbsp;·&nbsp; And more.

<br>

**Deploy on Vercel:**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fopendocuchat%2Fopendocuchat.git&project-name=opendocuchat&repository-name=opendocuchat&integration-ids=oac_PGzKMq4GfxF6TOqZfpFdrTXN&stores=%5B%7B%22type%22%3A%22postgres%22%2C%22envVarPrefix%22%3A%22MY_WEB%22%7D%2C%7B%22type%22%3A%22kv%22%7D%5D)

<br>

## Contact us

**💬 Equel Social: [Install app and join group chat with founders and peers](https://equel.me/Ha07PDysCMb)**

**✉️ Email: [support@opendocuchat.com](mailto:support@opendocuchat.com)**

**Events:**

📍 Berlin, Germany & Seoul, South Korea - Co-working Saturdays by OpenDocuChat - *Coming soon*

<br>

## For Contributors

<details>
<summary>Development to-do list</summary>

<br>

**Indexing**
- [X] Scrape Documentation Website
- - [X] Discover URLs to index
- - [X] Basic crawler settings (stay on domain, subdomain, path)
- - [X] Viewer for scraped page contents
- - [X] Trigger scraper from frontend to keep running on vercel (&window closing warning)
- - [X] Improve cancellation & completion logic
- - [X] Add selected URLs to index, with cost estimate
- - [X] Add cleanup function for stuck scrapers
- - [X] Add scraping progress indicator (# scraped vs queued, ETA, ...)
- - [ ] Add indexing status/queue?
- - [ ] Make JS rendering optional setting
- - [ ] Save links and page hierarchy in content
- - [ ] Add background updates with cron jobs
- - [ ] Split longer documents into smaller ones using LLM
- - [ ] Fragment/hash indexing/navigation for improved accuracy, especially on large pages (currently fragments are ignored)
- [ ] Public Repo
- - [X] Analyze repo size and projected embedding costs
- - [ ] Index all
- - [ ] Index subset (include/exclude logic)

**Search (RAG)**
- [X] Basic RAG
- [ ] Boost certain files/folders
- [ ] Use reranker

**Response**
- [X] Add chat widget
- [X] Update chat endpoints for basic llama & vercel pg 
- [X] Implement llama with citations
- [ ] Use llama function calling (https://docs.together.ai/docs/llama-3-function-calling)
- [ ] Add warmup
- [ ] Search query generation from context ("explain more" -> "explain more about x")
- [ ] Add reranker
- [ ] Add full screen chat


**Auth & Security**
- [x] set up auth.js with github oauth
- [X] Enforce auth on (private) pages via middleware
- [X] Add vercel kv to deploy to vercel button
- [X] use db table to verify which users have access
- [ ] Add short-lived tokens generated server-side for each chat session
- [ ] Add custom URLs to CORS allowed origins
- [ ] add OpenDocuChat github org ID to repo
- [ ] automate saving auth.js secret to vercel using: vercel env add AUTH_SECRET production < <(grep AUTH_SECRET .env.local | sed -n 's/.*="\([^"]*\)".*/\1/p' | tr -d '\n')

**Other**
- [x] Polish github readme
- [x] Set up `support@opendocuchat.com` email forwarding
- [ ] Add QA module (e.g. DSPy based, with training data generation via LLM reviewing individual pages)
- [ ] Automate local dev setup: make auto-generated Together AI env var also available in dev environment (is prod and stag per default). E.g. make post-deploy script running vercel link & vercel env pull --environment=Production

</details>

<br>

## Partners

<a href="https://www.quicksave.fi">
  <img src="./public/image/quicksave-logo.png" width="160px" alt="Quicksave logo" />
</a>

The upcoming AI chat in [Quicksave Toolkit](https://tools.quicksave.fi) documentation is co-developed and powered by OpenDocuChat.
