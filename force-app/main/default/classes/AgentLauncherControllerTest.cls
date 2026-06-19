@isTest
private class AgentLauncherControllerTest {

    @isTest
    static void resolveBotId_blankName_returnsNull() {
        Test.startTest();
        System.assertEquals(null, AgentLauncherController.resolveBotId(null),
            'A null developer name should resolve to null.');
        System.assertEquals(null, AgentLauncherController.resolveBotId('   '),
            'A blank developer name should resolve to null.');
        Test.stopTest();
    }

    @isTest
    static void resolveBotId_unknownName_returnsNull() {
        // BotDefinition rows can't be created in a test context, so an arbitrary
        // name resolves to null without throwing.
        Test.startTest();
        String botId = AgentLauncherController.resolveBotId('No_Such_Agent_' + DateTime.now().getTime());
        Test.stopTest();
        System.assertEquals(null, botId, 'An unknown developer name should resolve to null.');
    }

    @isTest
    static void listAgents_returnsListWithoutError() {
        Test.startTest();
        List<AgentLauncherController.AgentInfo> agents = AgentLauncherController.listAgents();
        Test.stopTest();
        System.assertNotEquals(null, agents, 'listAgents should always return a (possibly empty) list.');
    }
}
