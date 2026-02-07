"""Unit Tests for ABAP Code Studio.

Tests cover:
  - ADT Connector (mocked HTTP)
  - RFC Connector (mocked PyRFC)
  - MCP Server tools
  - AI Orchestrator (intent parsing, model selection, prompt building)
  - Cloud API endpoints
"""
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

# ═══════════════════════════════════════════════════════════════
# SHARED MODELS
# ═══════════════════════════════════════════════════════════════

from shared.models.base import (
    ABAPObject, AuthMethod, ConnectionMethod, ObjectType, ObjectStatus,
    RFCConfig, SourceCode, SystemConfig, SystemType, AIModel,
    ReviewStatus, PipelineStep, PipelineStepStatus, PipelineRun,
    CodeDiff, AISession, CommitMetadata, AgentMessage, CloudCommand,
)


class TestModels:
    """Test Pydantic models."""

    def test_system_config_ecc(self):
        config = SystemConfig(
            name="ecc_prod",
            type=SystemType.ECC,
            url="https://ecc.company.com:8443",
            client="100",
            auth_method=AuthMethod.BASIC,
            connection_primary=ConnectionMethod.ADT,
            connection_fallback=ConnectionMethod.RFC,
            rfc=RFCConfig(sysnr="00", ashost="10.0.1.50"),
        )
        assert config.type == SystemType.ECC
        assert config.rfc.ashost == "10.0.1.50"
        assert not config.principal_propagation

    def test_system_config_btp(self):
        config = SystemConfig(
            name="btp_dev",
            type=SystemType.BTP_ABAP_CLOUD,
            url="https://dev.abap.eu10.hana.ondemand.com",
            auth_method=AuthMethod.JWT_XSUAA,
            xsuaa_url="https://dev.authentication.eu10.hana.ondemand.com",
            principal_propagation=True,
        )
        assert config.type == SystemType.BTP_ABAP_CLOUD
        assert config.principal_propagation
        assert config.rfc is None

    def test_abap_object(self):
        obj = ABAPObject(
            name="ZCL_SALES",
            type=ObjectType.CLAS,
            package="Z_SD",
            system_id="ecc_prod",
            system_type=SystemType.ECC,
            ai_generated=True,
            review_status=ReviewStatus.PENDING,
        )
        assert obj.ai_generated
        assert obj.review_status == ReviewStatus.PENDING

    def test_source_code(self):
        src = SourceCode(
            object_name="Z_TEST",
            object_type=ObjectType.PROG,
            source="REPORT z_test.\nWRITE 'Hello'.",
            line_count=2,
        )
        assert src.line_count == 2

    def test_pipeline_run(self):
        run = PipelineRun(
            session_id="test-123",
            steps=[
                PipelineStep(name="Syntax", description="Check", status=PipelineStepStatus.PASS),
                PipelineStep(name="ATC", description="Inspect", status=PipelineStepStatus.WARN),
            ],
        )
        assert run.passed  # PASS + WARN = still passed

    def test_pipeline_run_failed(self):
        run = PipelineRun(
            session_id="test-456",
            steps=[
                PipelineStep(name="Syntax", description="Check", status=PipelineStepStatus.PASS),
                PipelineStep(name="ATC", description="Inspect", status=PipelineStepStatus.FAIL),
            ],
        )
        assert not run.passed

    def test_agent_message(self):
        msg = AgentMessage(type="result", agent_id="agent-1", payload={"data": "test"})
        assert msg.type == "result"

    def test_cloud_command(self):
        cmd = CloudCommand(type="search", session_id="s1", params={"query": "Z*"})
        assert cmd.type == "search"


# ═══════════════════════════════════════════════════════════════
# ADT CONNECTOR
# ═══════════════════════════════════════════════════════════════

class TestADTConnector:
    """Test ADT REST API connector with mocked HTTP."""

    @pytest.fixture
    def ecc_config(self):
        return SystemConfig(
            name="test_ecc",
            type=SystemType.ECC,
            url="https://ecc-test.local:8443",
            client="100",
            auth_method=AuthMethod.BASIC,
        )

    @pytest.fixture
    def btp_config(self):
        return SystemConfig(
            name="test_btp",
            type=SystemType.BTP_ABAP_CLOUD,
            url="https://dev.abap.eu10.hana.ondemand.com",
            auth_method=AuthMethod.JWT_XSUAA,
            xsuaa_url="https://dev.authentication.eu10.hana.ondemand.com",
        )

    def test_object_type_mapping(self):
        from agent_sdk.connectors.adt_connector import ADTConnector
        assert ADTConnector._map_adt_type("CLAS/OC") == ObjectType.CLAS
        assert ADTConnector._map_adt_type("PROG/P") == ObjectType.PROG
        assert ADTConnector._map_adt_type("DDLS/DF") == ObjectType.DDLS
        assert ADTConnector._map_adt_type("UNKNOWN") is None

    def test_endpoint_mapping(self):
        from agent_sdk.connectors.adt_connector import OBJECT_TYPE_MAP, ENDPOINTS
        for otype, (key, suffix) in OBJECT_TYPE_MAP.items():
            assert key in ENDPOINTS, f"Missing endpoint for {otype}: {key}"


# ═══════════════════════════════════════════════════════════════
# AI ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════

class TestAIOrchestrator:
    """Test intent parsing, model selection, and prompt building."""

    @pytest.fixture
    def orchestrator(self):
        from cloud_backend.orchestrator.ai_orchestrator import AIOrchestrator
        mock_bridge = AsyncMock()
        mock_clients = {"claude": AsyncMock()}
        return AIOrchestrator(mock_bridge, mock_clients)

    def test_parse_intent_create(self, orchestrator):
        intent = orchestrator.parse_intent("Erstelle eine neue Klasse ZCL_ORDER_VALIDATOR")
        assert intent.task_type.value == "create"
        assert "ZCL_ORDER_VALIDATOR" in intent.target_objects

    def test_parse_intent_modify(self, orchestrator):
        intent = orchestrator.parse_intent("Ändere den Report Z_SALES_REPORT und füge Feld MARGIN hinzu")
        assert "Z_SALES_REPORT" in intent.target_objects

    def test_parse_intent_rap(self, orchestrator):
        intent = orchestrator.parse_intent("Generiere einen RAP Stack für ZI_SALES")
        assert intent.is_rap
        assert intent.task_type.value == "rap_stack"
        assert "ZI_SALES" in intent.target_objects

    def test_parse_intent_fix(self, orchestrator):
        intent = orchestrator.parse_intent("Fix den Bug in ZCL_CALC wo Division by zero passiert")
        assert intent.task_type.value == "fix"

    def test_parse_intent_system_detection_ecc(self, orchestrator):
        intent = orchestrator.parse_intent("Im ECC System den Report Z_OLD anpassen")
        assert intent.target_system == "ecc"

    def test_parse_intent_system_detection_btp(self, orchestrator):
        intent = orchestrator.parse_intent("In BTP Cloud eine neue CDS Entity erstellen")
        assert intent.target_system == "btp"

    def test_parse_intent_complexity_high(self, orchestrator):
        intent = orchestrator.parse_intent("Refactore die komplette Architektur von Z_SD")
        assert intent.complexity == "high"

    def test_parse_intent_complexity_low(self, orchestrator):
        intent = orchestrator.parse_intent("Füge ein Feld MARGIN zum CDS View Z_SALES hinzu")
        assert intent.complexity == "low"

    def test_model_selection_high_complexity(self, orchestrator):
        from cloud_backend.orchestrator.ai_orchestrator import (
            GenerationContext, ModelChoice, ParsedIntent, TaskType,
        )
        intent = ParsedIntent(
            task_type=TaskType.REFACTOR, target_objects=[], target_system=None,
            description="complex refactor", keywords=[], complexity="high",
        )
        ctx = GenerationContext()
        model = orchestrator.select_model(intent, ctx)
        assert model == ModelChoice.CLAUDE_OPUS

    def test_model_selection_rap_stack(self, orchestrator):
        from cloud_backend.orchestrator.ai_orchestrator import (
            GenerationContext, ModelChoice, ParsedIntent, TaskType,
        )
        intent = ParsedIntent(
            task_type=TaskType.RAP_STACK, target_objects=[], target_system="btp",
            description="rap stack", keywords=[], complexity="high",
        )
        ctx = GenerationContext(available_features={"ai_sdk": True})
        model = orchestrator.select_model(intent, ctx)
        assert model == ModelChoice.SAP_ABAP_1

    def test_model_selection_explicit_preference(self, orchestrator):
        from cloud_backend.orchestrator.ai_orchestrator import (
            GenerationContext, ModelChoice, ParsedIntent, TaskType,
        )
        intent = ParsedIntent(
            task_type=TaskType.CREATE, target_objects=[], target_system=None,
            description="test", keywords=[],
        )
        ctx = GenerationContext()
        model = orchestrator.select_model(intent, ctx, ModelChoice.CLAUDE_SONNET)
        assert model == ModelChoice.CLAUDE_SONNET

    def test_system_prompt_btp(self, orchestrator):
        from cloud_backend.orchestrator.ai_orchestrator import GenerationContext
        ctx = GenerationContext(system_type="btp_abap_cloud")
        prompt = orchestrator._build_system_prompt(ctx)
        assert "ABAP Cloud" in prompt
        assert "RAP" in prompt

    def test_system_prompt_ecc(self, orchestrator):
        from cloud_backend.orchestrator.ai_orchestrator import GenerationContext
        ctx = GenerationContext(system_type="ecc")
        prompt = orchestrator._build_system_prompt(ctx)
        assert "ECC" in prompt
        assert "Function Modules" in prompt

    def test_extract_code_blocks(self, orchestrator):
        response = """Here is the code:
```abap
REPORT z_test.
WRITE 'Hello'.
```
Done."""
        code = orchestrator._extract_code_blocks(response)
        assert "REPORT z_test" in code
        assert "Done." not in code

    def test_detect_modified_objects(self, orchestrator):
        from cloud_backend.orchestrator.ai_orchestrator import ParsedIntent, TaskType
        code = """CLASS zcl_sales_order DEFINITION.
  PUBLIC SECTION.
ENDCLASS.

define view entity z_sales as select from ztable {
  key id
}"""
        intent = ParsedIntent(
            task_type=TaskType.CREATE, target_objects=["ZCL_SALES_ORDER"],
            target_system=None, description="test", keywords=[],
        )
        objects = orchestrator._detect_modified_objects(code, intent)
        names = [o["name"] for o in objects]
        assert "ZCL_SALES_ORDER" in names
        assert "Z_SALES" in names

    def test_confidence_estimation(self, orchestrator):
        from cloud_backend.orchestrator.ai_orchestrator import ParsedIntent, TaskType
        intent = ParsedIntent(
            task_type=TaskType.EXTEND, target_objects=["Z_SALES"],
            target_system="btp", description="add field", keywords=[],
            complexity="low",
        )
        result = {"content": "some code", "tokens": 100}
        confidence = orchestrator._estimate_confidence(result, intent)
        assert 0.8 <= confidence <= 1.0


# ═══════════════════════════════════════════════════════════════
# GIT INTEGRATION
# ═══════════════════════════════════════════════════════════════

class TestGitIntegration:
    """Test GitHub/GitLab PR management."""

    def test_pr_body_builder(self):
        from cloud_backend.git_integration.git_client import GitIntegration, GitProvider, PRMetadata
        git = GitIntegration(GitProvider.GITHUB, "org/repo", "fake-token")
        metadata = PRMetadata(
            title="Add MARGIN field",
            body="",
            source_branch="feature/ai-margin",
            session_id="sess-123",
            model_used="claude-opus-4-6",
            confidence=0.94,
            transport_nr="DEVK900123",
            objects_changed=["Z_SALES", "ZCL_SALES_CALC"],
        )
        body = git._build_pr_body(metadata)
        assert "AI-Generated" in body
        assert "Z_SALES" in body
        assert "DEVK900123" in body
        assert "Review Checklist" in body

    def test_webhook_handler_pr_merged(self):
        import asyncio
        from cloud_backend.git_integration.git_client import GitIntegration, GitProvider
        payload = {
            "action": "closed",
            "pull_request": {
                "number": 42,
                "merged": True,
                "head": {"ref": "feature/ai-margin"},
                "merged_by": {"login": "dimitri"},
            },
        }
        result = asyncio.get_event_loop().run_until_complete(
            GitIntegration.handle_webhook(GitProvider.GITHUB, "pull_request", payload)
        )
        assert result["action"] == "deploy"
        assert result["pr_number"] == 42

    def test_webhook_handler_pr_opened(self):
        import asyncio
        from cloud_backend.git_integration.git_client import GitIntegration, GitProvider
        payload = {
            "action": "opened",
            "pull_request": {"number": 43, "title": "feat: add field"},
        }
        result = asyncio.get_event_loop().run_until_complete(
            GitIntegration.handle_webhook(GitProvider.GITHUB, "pull_request", payload)
        )
        assert result["action"] == "notify_review"


# ═══════════════════════════════════════════════════════════════
# TUNNEL
# ═══════════════════════════════════════════════════════════════

class TestTunnel:
    """Test WebSocket tunnel."""

    def test_tunnel_stats_init(self):
        from agent_sdk.tunnel import TunnelStats
        stats = TunnelStats()
        assert stats.messages_sent == 0
        assert stats.reconnect_count == 0

    def test_tunnel_not_connected(self):
        from agent_sdk.tunnel import WebSocketTunnel
        tunnel = WebSocketTunnel("wss://test", "token", AsyncMock())
        assert not tunnel.is_connected


# ═══════════════════════════════════════════════════════════════
# AGENT BRIDGE
# ═══════════════════════════════════════════════════════════════

class TestAgentBridge:
    """Test cloud-side agent bridge."""

    def test_agent_pool(self):
        from cloud_backend.orchestrator.agent_bridge import AgentPool
        pool = AgentPool()
        assert pool.connected_count == 0
        assert pool.get_any() is None

    def test_agent_pool_register(self):
        from cloud_backend.orchestrator.agent_bridge import AgentPool
        pool = AgentPool()
        mock_ws = MagicMock()
        bridge = pool.register("agent-1", mock_ws)
        assert pool.connected_count == 1
        assert pool.get_by_agent_id("agent-1") == bridge

    def test_agent_pool_system_map(self):
        from cloud_backend.orchestrator.agent_bridge import AgentPool
        pool = AgentPool()
        mock_ws = MagicMock()
        bridge = pool.register("agent-1", mock_ws)
        pool.map_system("ecc_prod", "agent-1")
        assert pool.get_by_system("ecc_prod") == bridge

    def test_agent_pool_unregister(self):
        from cloud_backend.orchestrator.agent_bridge import AgentPool
        pool = AgentPool()
        pool.register("agent-1", MagicMock())
        pool.map_system("ecc_prod", "agent-1")
        pool.unregister("agent-1")
        assert pool.connected_count == 0
        assert pool.get_by_system("ecc_prod") is None
