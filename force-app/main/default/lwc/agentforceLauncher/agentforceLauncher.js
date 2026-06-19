import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
// Agentforce Conversation Client (ACC) API. Headless lightning/accApi module that
// routes app-to-panel messages to the native Agentforce side panel (desktop LEX,
// API 59.0+, Agentforce enabled). All methods are async and return Promise<void>.
import { open as openPanel, close as closePanel, execute as executeUtterance } from 'lightning/accApi';
import resolveBotId from '@salesforce/apex/AgentLauncherController.resolveBotId';
import listAgents from '@salesforce/apex/AgentLauncherController.listAgents';

const PRESETS = [
    'Hello! What can you do?',
    'Give me a quick summary.',
    'What are my open tasks?',
    'Thanks, goodbye!'
];

export default class AgentforceLauncher extends LightningElement {
    // ---- Design / host attributes (App Builder, Utility Bar, Aura wrapper) ----
    @api cardTitle = 'Agentforce Launcher (ACC API)';
    @api agentDeveloperName = 'HelloWorld';
    @api botId; // optional explicit 0Xx... override; wins over the developer name
    @api defaultUtterance = 'Hello! What can you do?';
    @api compact = false; // tighter layout for the utility bar
    // Provided automatically on record pages / object-specific quick actions.
    @api recordId;
    @api objectApiName;

    // ---- runtime state ----
    resolvedBotId;
    resolving = false;
    resolveError = '';
    runtimeName = '';
    utterance = '';
    agentOptions = [];
    activeAction = '';
    logId = 0;
    log = [];

    connectedCallback() {
        this.runtimeName = this.agentDeveloperName || '';
        this.utterance = this.defaultUtterance || '';
        this.loadAgents();
        // A configured Bot Id wins; otherwise resolve the configured API name.
        if (this.botId) {
            this.resolvedBotId = this.botId;
        } else {
            this.resolveFromName();
        }
    }

    async loadAgents() {
        try {
            const agents = await listAgents();
            this.agentOptions = (agents || []).map((a) => ({
                label: `${a.label} (${a.developerName})`,
                value: a.botId
            }));
        } catch (error) {
            // Non-fatal: the picker is a convenience; the configured agent still works.
            this.agentOptions = [];
        }
    }

    async resolveFromName() {
        const name = (this.runtimeName || '').trim();
        if (!name) {
            this.resolveError = 'Enter an agent API name to resolve.';
            return;
        }
        this.resolving = true;
        this.resolveError = '';
        try {
            const id = await resolveBotId({ developerName: name });
            if (id) {
                this.resolvedBotId = id;
            } else {
                this.resolveError = `No agent found with API name "${name}".`;
            }
        } catch (error) {
            this.resolveError = this.errorMessage(error);
        } finally {
            this.resolving = false;
        }
    }

    // ---- computed ----
    get effectiveBotId() {
        // Runtime selection (resolved name / picked agent) takes precedence over
        // the configured Bot Id; never mutate the @api botId property in place.
        return this.resolvedBotId || this.botId;
    }

    get hasBotId() {
        return !!this.effectiveBotId;
    }

    get busy() {
        return !!this.activeAction;
    }

    get openLastDisabled() {
        return this.busy;
    }

    get openAgentDisabled() {
        return this.busy || !this.hasBotId;
    }

    get closeDisabled() {
        return this.busy;
    }

    get executeDisabled() {
        return this.busy || !this.hasBotId || !this.utterance || !this.utterance.trim();
    }

    get queueDisabled() {
        return this.busy || !this.hasBotId;
    }

    get spinnerOpenLast() {
        return this.activeAction === 'openLast';
    }
    get spinnerOpenAgent() {
        return this.activeAction === 'openAgent';
    }
    get spinnerClose() {
        return this.activeAction === 'close';
    }
    get spinnerExecute() {
        return this.activeAction === 'execute';
    }
    get spinnerQueue() {
        return this.activeAction === 'queue';
    }

    get hasAgentOptions() {
        return this.agentOptions.length > 0;
    }

    get presetChips() {
        return PRESETS.map((text, i) => ({ key: `preset-${i}`, text }));
    }

    get statusClass() {
        return this.hasBotId ? 'status status--ok' : 'status status--warn';
    }

    get statusIcon() {
        return this.hasBotId ? 'utility:success' : 'utility:warning';
    }

    get statusVariant() {
        return this.hasBotId ? 'success' : 'warning';
    }

    get statusText() {
        if (this.resolving) {
            return 'Resolving agent…';
        }
        if (this.hasBotId) {
            return `Target agent ready · Bot Id ${this.effectiveBotId}`;
        }
        return this.resolveError || 'No agent resolved yet. Enter an API name and resolve.';
    }

    get contextText() {
        if (!this.recordId) {
            return '';
        }
        return this.objectApiName
            ? `Context: ${this.objectApiName} · ${this.recordId}`
            : `Context: ${this.recordId}`;
    }

    get hasContext() {
        return !!this.recordId;
    }

    get hasLog() {
        return this.log.length > 0;
    }

    get containerClass() {
        return this.compact ? 'wrap wrap--compact' : 'wrap';
    }

    // ---- config handlers ----
    handleNameChange(event) {
        this.runtimeName = event.target.value;
    }

    handleResolveClick() {
        this.resolveFromName();
    }

    handleAgentPick(event) {
        this.resolvedBotId = event.detail.value;
        this.resolveError = '';
        const picked = this.agentOptions.find((o) => o.value === event.detail.value);
        this.addLog('Agent selected', picked ? picked.label : event.detail.value, 'utility:einstein', 'info');
    }

    handleUtteranceChange(event) {
        this.utterance = event.target.value;
    }

    handlePreset(event) {
        this.utterance = event.currentTarget.dataset.text;
        const input = this.template.querySelector('.utterance-input');
        if (input) {
            input.value = this.utterance;
        }
    }

    // ---- ACC API: open() — open the panel with the last used agent ----
    async handleOpenLast() {
        this.activeAction = 'openLast';
        try {
            await openPanel();
            this.addLog('open()', 'Opened panel with the last used agent.', 'utility:open', 'success');
        } catch (error) {
            this.fail('open()', error);
        } finally {
            this.activeAction = '';
        }
    }

    // ---- ACC API: open(botId) — open the panel with a specific agent ----
    async handleOpenAgent() {
        if (!this.hasBotId) {
            return;
        }
        this.activeAction = 'openAgent';
        try {
            await openPanel(this.effectiveBotId);
            this.addLog('open(botId)', `Opened agent ${this.effectiveBotId}.`, 'utility:open', 'success');
        } catch (error) {
            this.fail('open(botId)', error);
        } finally {
            this.activeAction = '';
        }
    }

    // ---- ACC API: close() — hide the panel ----
    async handleClose() {
        this.activeAction = 'close';
        try {
            await closePanel();
            this.addLog('close()', 'Closed the Agentforce panel.', 'utility:close', 'success');
        } catch (error) {
            this.fail('close()', error);
        } finally {
            this.activeAction = '';
        }
    }

    // ---- ACC API: execute(utterance, botId) — send a natural-language message ----
    async handleExecute() {
        if (this.executeDisabled) {
            return;
        }
        const text = this.utterance.trim();
        this.activeAction = 'execute';
        try {
            await executeUtterance(text, this.effectiveBotId);
            this.addLog('execute(utterance, botId)', `Sent: "${text}"`, 'utility:send', 'success');
        } catch (error) {
            this.fail('execute(utterance, botId)', error);
        } finally {
            this.activeAction = '';
        }
    }

    // Demonstrates the API's strict in-order queueing: three messages fired
    // back-to-back are delivered to the agent one after another.
    async handleQueueDemo() {
        if (this.queueDisabled) {
            return;
        }
        const batch = ['Question 1 of 3', 'Question 2 of 3', 'Question 3 of 3'];
        this.activeAction = 'queue';
        try {
            await openPanel(this.effectiveBotId);
            for (let i = 0; i < batch.length; i++) {
                await executeUtterance(batch[i], this.effectiveBotId);
                this.addLog('execute() · queued', `(${i + 1}/3) "${batch[i]}"`, 'utility:notification', 'info');
            }
            this.addLog('Queue demo complete', 'All three utterances were executed in sequence.', 'utility:success', 'success');
        } catch (error) {
            this.fail('execute() · queue demo', error);
        } finally {
            this.activeAction = '';
        }
    }

    handleClearLog() {
        this.log = [];
    }

    // ---- helpers ----
    fail(label, error) {
        const msg = this.errorMessage(error);
        this.addLog(label, msg, 'utility:error', 'error');
        this.dispatchEvent(
            new ShowToastEvent({ title: `${label} failed`, message: msg, variant: 'error' })
        );
    }

    addLog(label, detail, icon, variant) {
        this.logId += 1;
        const entry = {
            id: this.logId,
            label,
            detail,
            icon: icon || 'utility:info',
            variant: variant || 'info',
            time: new Date().toLocaleTimeString(),
            itemClass: `log-item log-item--${variant || 'info'}`
        };
        this.log = [entry, ...this.log].slice(0, 25);
    }

    errorMessage(error) {
        return (
            error?.body?.message ||
            error?.message ||
            (typeof error === 'string' ? error : 'Unexpected error. This API requires Agentforce on desktop Lightning Experience.')
        );
    }
}
