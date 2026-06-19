/**
 * Helper for the agentforceLauncher LWC. The Agentforce Conversation Client (ACC)
 * API — lightning/accApi — identifies an agent by its 18-char Bot Id (0Xx...), but
 * admins usually only know the agent's API (developer) name, e.g. "HelloWorld".
 * This class resolves that developer name to the Bot Id at runtime by querying the
 * standard BotDefinition object, so the component can be configured with a name
 * instead of a hard-coded Id.
 */
public with sharing class AgentLauncherController {

    /**
     * Lightweight DTO describing one Agentforce agent / Einstein bot.
     */
    public class AgentInfo {
        @AuraEnabled public String botId;
        @AuraEnabled public String developerName;
        @AuraEnabled public String label;
    }

    /**
     * Resolve an agent's Bot Id (0Xx...) from its developer (API) name.
     *
     * @param developerName the BotDefinition.DeveloperName, e.g. "HelloWorld".
     * @return the matching Bot Id, or null when the name is blank or not found.
     */
    @AuraEnabled(cacheable=true)
    public static String resolveBotId(String developerName) {
        if (String.isBlank(developerName)) {
            return null;
        }
        String dev = developerName.trim();
        List<BotDefinition> bots = [
            SELECT Id
            FROM BotDefinition
            WHERE DeveloperName = :dev
            LIMIT 1
        ];
        return bots.isEmpty() ? null : bots[0].Id;
    }

    /**
     * List the agents / bots in the org so the component can offer a picker and
     * let users target any agent (not just the configured default) with the API.
     *
     * @return agents ordered by their display label.
     */
    @AuraEnabled(cacheable=true)
    public static List<AgentInfo> listAgents() {
        List<AgentInfo> agents = new List<AgentInfo>();
        for (BotDefinition bot : [
            SELECT Id, DeveloperName, MasterLabel
            FROM BotDefinition
            ORDER BY MasterLabel
            LIMIT 200
        ]) {
            AgentInfo info = new AgentInfo();
            info.botId = bot.Id;
            info.developerName = bot.DeveloperName;
            info.label = String.isBlank(bot.MasterLabel) ? bot.DeveloperName : bot.MasterLabel;
            agents.add(info);
        }
        return agents;
    }
}
