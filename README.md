# Launch Agentforce Agent from LWC

A Salesforce Lightning Web Component (LWC) that programmatically controls the native **Agentforce side panel** using the headless `lightning/accApi` module.

> Blog: [salesforcediaries.com](https://salesforcediaries.com)

---

## What This Does

The `agentforceLauncher` LWC exposes all three methods of the Agentforce Conversation Client (ACC) API in a single, interactive component:

| Method | What it does |
|---|---|
| `open()` | Opens the Agentforce panel with the **last used agent** (no Bot Id needed) |
| `open(botId)` | Opens the panel targeting a **specific agent** by its 18-char Bot Id (`0Xx…`) |
| `close()` | Hides the Agentforce panel |
| `execute(utterance, botId)` | Sends a natural-language message to the agent as if the user typed it |

A built-in **queue demo** fires three utterances back-to-back to demonstrate the API's strict in-order delivery.

---

## Components

### `agentforceLauncher` — Lightning Web Component

| File | Purpose |
|---|---|
| `agentforceLauncher.html` | UI — status strip, resolver, ACC API variant cards, utterance input, activity log |
| `agentforceLauncher.js` | Controller — ACC API calls (`open`, `close`, `execute`), agent resolution, activity logging |
| `agentforceLauncher.css` | Styles — SLDS-aligned, compact mode support, responsive grid |
| `agentforceLauncher.js-meta.xml` | Component metadata — targets, `@api` property definitions for App Builder |

#### `@api` Properties (configurable in App Builder / Utility Bar)

| Property | Type | Default | Description |
|---|---|---|---|
| `cardTitle` | String | `'Agentforce Launcher (ACC API)'` | Card header label |
| `agentDeveloperName` | String | `'HelloWorld'` | `BotDefinition.DeveloperName` — resolved to a Bot Id at runtime |
| `botId` | String | — | Explicit `0Xx…` Bot Id override; takes precedence over the developer name |
| `defaultUtterance` | String | `'Hello! What can you do?'` | Pre-filled utterance text |
| `compact` | Boolean | `false` | Tighter layout for the utility bar (`true` by default in utility bar target) |
| `recordId` | String | — | Injected automatically on record pages |
| `objectApiName` | String | — | Injected automatically on record pages |

#### Supported Page Targets

- `lightning__AppPage`
- `lightning__HomePage`
- `lightning__RecordPage`
- `lightning__Tab`
- `lightning__UtilityBar`
- `lightning__RecordAction` (screen action)

---

### `AgentLauncherController` — Apex Class

Provides two `@AuraEnabled(cacheable=true)` methods used by the LWC:

#### `resolveBotId(String developerName) → String`
Resolves an agent's 18-char Bot Id from its `BotDefinition.DeveloperName`.
Returns `null` when the name is blank or not found — never throws.

#### `listAgents() → List<AgentInfo>`
Returns up to 200 agents in the org ordered by label. Each `AgentInfo` contains:
- `botId` — the `0Xx…` record Id
- `developerName` — the API name
- `label` — display name (falls back to `developerName` if `MasterLabel` is blank)

---

## Prerequisites

- Salesforce org with **Agentforce** enabled
- **Desktop Lightning Experience** (the `lightning/accApi` module is not supported in mobile or communities)
- API version **59.0+** (set in `agentforceLauncher.js-meta.xml` at `66.0`)
- The running user must have access to the `BotDefinition` standard object

---

## Deployment

### 1. Clone the repository

```bash
git clone https://github.com/SalesforceDiariesBySanket/Launch-Agentforce-Agent-from-LWC.git
cd Launch-Agentforce-Agent-from-LWC
```

### 2. Authenticate to your org

```bash
sf org login web --alias my-org
```

### 3. Deploy

```bash
sf project deploy start --source-dir force-app --target-org my-org
```

### 4. Add to a page

Open **Lightning App Builder**, drag **Agentforce Launcher (ACC API)** onto any App, Home, or Record page, configure the **Agent API name** property, and activate the page.

For the **Utility Bar**, add the component via **App Manager → Utility Items**.

---

## How It Works

```
App Builder config
  └── agentDeveloperName = "MyAgent"
        │
        ▼
  AgentLauncherController.resolveBotId("MyAgent")
        │  SOQL: SELECT Id FROM BotDefinition WHERE DeveloperName = :dev
        ▼
  resolvedBotId = "0Xx000000000001"
        │
        ▼
  lightning/accApi
    open(resolvedBotId)        → opens side panel for MyAgent
    execute(text, resolvedBotId) → sends utterance to MyAgent
    close()                    → hides the side panel
```

---

## File Structure

```
force-app/main/default/
├── classes/
│   ├── AgentLauncherController.cls
│   ├── AgentLauncherController.cls-meta.xml
│   ├── AgentLauncherControllerTest.cls
│   └── AgentLauncherControllerTest.cls-meta.xml
└── lwc/
    └── agentforceLauncher/
        ├── agentforceLauncher.html
        ├── agentforceLauncher.js
        ├── agentforceLauncher.css
        └── agentforceLauncher.js-meta.xml
```

---

## Notes

- The `execute` method **does not return** the agent's reply — it only sends the utterance.
- The queue demo shows that back-to-back `execute()` calls are delivered **in order** (the API queues them internally).
- `BotDefinition` rows cannot be created in a test context, so `resolveBotId` gracefully returns `null` for unknown names in tests.

---

## License

MIT — see [LICENSE](LICENSE)

---

*The content in this repository reflects personal views and does not represent any employer or affiliated organization.*
