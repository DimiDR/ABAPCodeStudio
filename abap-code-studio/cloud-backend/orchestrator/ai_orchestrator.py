"""AI Orchestrator — The Brain of ABAP Code Studio.

Responsibilities:
  1. Parse user intent from natural language prompt
  2. Build rich context by reading SAP objects (via Agent WebSocket)
  3. Select the right AI model (SAP-ABAP-1 vs Claude vs GPT)
  4. Construct system-specific prompts (classic ABAP vs ABAP Cloud)
  5. Parse and validate AI-generated code
  6. Create diffs and trigger pipeline
"""
from __future__ import annotations

import json
import logging
import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════
# INTENT CLASSIFICATION
# ═══════════════════════════════════════════════════════════════

class TaskType(str, Enum):
    CREATE = "create"           # New object from scratch
    MODIFY = "modify"           # Change existing object
    EXTEND = "extend"           # Add field/method/parameter
    REFACTOR = "refactor"       # Restructure without behavior change
    FIX = "fix"                 # Bug fix
    EXPLAIN = "explain"         # Explain existing code
    ANALYZE = "analyze"         # Architecture / dependency analysis
    TEST = "test"               # Generate unit tests
    RAP_STACK = "rap_stack"     # Generate full RAP stack


class ModelChoice(str, Enum):
    SAP_ABAP_1 = "sap-abap-1"          # Best for ABAP code generation
    CLAUDE_OPUS = "claude-opus-4-6"     # Best for complex reasoning
    CLAUDE_SONNET = "claude-sonnet-4-5" # Fast, good for simple tasks
    AUTO = "auto"


@dataclass
class ParsedIntent:
    """Structured understanding of what the user wants."""
    task_type: TaskType
    target_objects: list[str]           # Object names mentioned
    target_system: Optional[str]        # ECC / BTP / auto
    description: str                    # Cleaned description
    keywords: list[str]                 # Technical keywords found
    is_rap: bool = False                # Involves RAP (BTP only)
    is_cross_system: bool = False       # Involves both ECC and BTP
    complexity: str = "medium"          # low / medium / high
    confidence: float = 0.9


@dataclass
class GenerationContext:
    """Rich context assembled from SAP system for the AI prompt."""
    target_object: Optional[str] = None
    target_type: Optional[str] = None
    existing_source: Optional[str] = None
    related_objects: list[dict] = field(default_factory=list)
    table_structures: list[dict] = field(default_factory=list)
    dependencies: list[str] = field(default_factory=list)
    system_type: str = "btp_abap_cloud"  # ecc | btp_abap_cloud
    basis_version: Optional[str] = None
    available_features: dict = field(default_factory=dict)


@dataclass
class GenerationResult:
    """Output from the AI code generation."""
    session_id: str
    model_used: ModelChoice
    generated_code: str
    objects_modified: list[dict]         # [{name, type, action}]
    diff: str
    confidence: float
    thinking: list[str]                  # Chain of thought steps
    mcp_tools_used: list[str]
    tokens_used: int = 0
    generation_time_ms: int = 0


class AIOrchestrator:
    """Orchestrates the full AI code generation pipeline.

    Flow:
      1. parse_intent() → ParsedIntent
      2. build_context() → GenerationContext (calls Agent via WebSocket)
      3. select_model() → ModelChoice
      4. generate() → GenerationResult
      5. validate() → list[issues]
    """

    def __init__(self, agent_bridge, ai_clients: dict):
        """
        Args:
            agent_bridge: Interface to send commands to the Client Agent
            ai_clients: Dict of AI client instances {"claude": ..., "sap": ...}
        """
        self.agent = agent_bridge
        self.ai_clients = ai_clients

    # ─── STEP 1: Parse Intent ───────────────────────────────

    def parse_intent(self, prompt: str) -> ParsedIntent:
        """Parse natural language prompt into structured intent."""

        prompt_lower = prompt.lower()

        # Extract object names (Z* or Y* namespace)
        objects = re.findall(r'\b[ZY][A-Z_][A-Z0-9_]{1,29}\b', prompt.upper())

        # Detect task type
        task_type = self._classify_task(prompt_lower)

        # Detect system target
        target_system = None
        if any(kw in prompt_lower for kw in ["ecc", "on-premise", "on premise", "klassisch"]):
            target_system = "ecc"
        elif any(kw in prompt_lower for kw in ["btp", "cloud", "rap", "steampunk"]):
            target_system = "btp"

        # Detect RAP involvement
        is_rap = any(kw in prompt_lower for kw in [
            "rap", "behavior", "bdef", "service binding", "service definition",
            "cds entity", "managed", "unmanaged", "projection",
        ])

        # Detect complexity
        complexity = "low"
        if any(kw in prompt_lower for kw in ["rap stack", "full stack", "architektur", "refactor"]):
            complexity = "high"
        elif any(kw in prompt_lower for kw in ["feld hinzufügen", "add field", "fix", "fehler"]):
            complexity = "low"
        else:
            complexity = "medium"

        # Extract technical keywords
        keywords = self._extract_keywords(prompt_lower)

        return ParsedIntent(
            task_type=task_type,
            target_objects=objects,
            target_system=target_system,
            description=prompt,
            keywords=keywords,
            is_rap=is_rap,
            is_cross_system=target_system is None and len(objects) > 1,
            complexity=complexity,
        )

    def _classify_task(self, prompt: str) -> TaskType:
        """Classify the task type from the prompt."""
        patterns = {
            TaskType.CREATE: ["erstelle", "create", "baue", "build", "generiere", "neue", "neuen", "anlegen"],
            TaskType.MODIFY: ["ändere", "modify", "update", "anpassen", "ändern"],
            TaskType.EXTEND: ["füge hinzu", "add", "erweitere", "extend", "ergänze", "feld"],
            TaskType.REFACTOR: ["refactor", "restructure", "umbauen", "aufräumen", "clean up"],
            TaskType.FIX: ["fix", "fehler", "bug", "korrigiere", "repariere", "repair"],
            TaskType.EXPLAIN: ["erklär", "explain", "was macht", "what does", "analysiere den code"],
            TaskType.ANALYZE: ["abhängigkeiten", "dependencies", "where-used", "verwendung", "architektur"],
            TaskType.TEST: ["test", "unit test", "abap unit", "testklasse"],
            TaskType.RAP_STACK: ["rap stack", "full stack", "rap generieren", "service binding"],
        }
        for task_type, keywords in patterns.items():
            if any(kw in prompt for kw in keywords):
                return task_type
        return TaskType.MODIFY

    def _extract_keywords(self, prompt: str) -> list[str]:
        """Extract technical ABAP keywords from the prompt."""
        abap_keywords = [
            "select", "loop", "method", "class", "interface", "bapi", "rfc",
            "cds", "ddl", "annotation", "association", "composition",
            "authorization", "determination", "validation", "action",
            "draft", "managed", "unmanaged", "abstract",
            "alv", "smartforms", "sapscript", "badi", "enhancement",
            "idoc", "ale", "edi", "workflow",
        ]
        found = [kw for kw in abap_keywords if kw in prompt]
        return found

    # ─── STEP 2: Build Context ──────────────────────────────

    async def build_context(
        self,
        intent: ParsedIntent,
        system_name: str,
    ) -> GenerationContext:
        """Build rich context by reading objects from SAP via Agent.

        This sends commands to the Client Agent via WebSocket.
        The Agent executes locally and returns only what's needed.
        """
        ctx = GenerationContext()

        # Search for target objects
        if intent.target_objects:
            for obj_name in intent.target_objects[:5]:  # Limit to 5 objects
                search_result = await self.agent.send_command(
                    "search", {"query": obj_name, "system": system_name}
                )
                if search_result:
                    objects = json.loads(search_result)
                    ctx.related_objects.extend(objects)

                    # Read source of the primary target
                    if objects and not ctx.existing_source:
                        obj = objects[0]
                        source_result = await self.agent.send_command(
                            "read", {
                                "object_name": obj["name"],
                                "object_type": obj["type"],
                                "system": system_name,
                            }
                        )
                        if source_result:
                            ctx.existing_source = source_result
                            ctx.target_object = obj["name"]
                            ctx.target_type = obj["type"]

        # Read table structures if CDS or data-related
        if any(kw in intent.keywords for kw in ["cds", "select", "association"]):
            for obj in ctx.related_objects:
                if obj.get("type") == "TABL":
                    structure = await self.agent.send_command(
                        "table_structure", {
                            "table_name": obj["name"],
                            "system": system_name,
                        }
                    )
                    if structure:
                        ctx.table_structures.append({
                            "table": obj["name"],
                            "fields": json.loads(structure),
                        })

        # Detect system capabilities
        systems_info = await self.agent.send_command("systems", {})
        if systems_info:
            systems = json.loads(systems_info)
            for sys in systems:
                if sys["name"] == system_name:
                    ctx.system_type = sys.get("type", "ecc")
                    ctx.available_features = sys.get("features", {})
                    break

        return ctx

    # ─── STEP 3: Select Model ───────────────────────────────

    def select_model(
        self,
        intent: ParsedIntent,
        ctx: GenerationContext,
        preference: ModelChoice = ModelChoice.AUTO,
    ) -> ModelChoice:
        """Select the best AI model for the task.

        Routing logic:
        - SAP-ABAP-1: Syntax-heavy code generation (best ABAP knowledge)
        - Claude Opus: Complex reasoning, refactoring, architecture
        - Claude Sonnet: Quick tasks, explanations, simple modifications
        """
        if preference != ModelChoice.AUTO:
            return preference

        # High complexity → Claude Opus
        if intent.complexity == "high":
            return ModelChoice.CLAUDE_OPUS

        # Explanation / Analysis → Claude Opus
        if intent.task_type in (TaskType.EXPLAIN, TaskType.ANALYZE):
            return ModelChoice.CLAUDE_OPUS

        # RAP Stack generation → SAP-ABAP-1 (best RAP knowledge)
        if intent.task_type == TaskType.RAP_STACK:
            return ModelChoice.SAP_ABAP_1

        # Simple code gen → SAP-ABAP-1
        if intent.task_type in (TaskType.CREATE, TaskType.EXTEND, TaskType.TEST):
            if ctx.available_features.get("ai_sdk"):
                return ModelChoice.SAP_ABAP_1
            return ModelChoice.CLAUDE_SONNET

        # Fix / Modify → Claude Sonnet (fast + good enough)
        if intent.task_type in (TaskType.FIX, TaskType.MODIFY):
            return ModelChoice.CLAUDE_SONNET

        # Refactor → Claude Opus (needs deep understanding)
        if intent.task_type == TaskType.REFACTOR:
            return ModelChoice.CLAUDE_OPUS

        return ModelChoice.CLAUDE_SONNET

    # ─── STEP 4: Generate Code ──────────────────────────────

    async def generate(
        self,
        intent: ParsedIntent,
        ctx: GenerationContext,
        model: ModelChoice,
    ) -> GenerationResult:
        """Generate ABAP code using the selected AI model."""

        session_id = str(uuid.uuid4())
        start_time = datetime.utcnow()
        thinking = []

        # Build the prompt
        system_prompt = self._build_system_prompt(ctx)
        user_prompt = self._build_user_prompt(intent, ctx)

        thinking.append(f"Model: {model.value}")
        thinking.append(f"System: {ctx.system_type}")
        thinking.append(f"Task: {intent.task_type.value}")
        if ctx.target_object:
            thinking.append(f"Target: {ctx.target_object} ({ctx.target_type})")
        thinking.append(f"Context: {len(ctx.related_objects)} related objects")

        # Call AI model
        if model in (ModelChoice.CLAUDE_OPUS, ModelChoice.CLAUDE_SONNET):
            result = await self._call_claude(model, system_prompt, user_prompt)
        elif model == ModelChoice.SAP_ABAP_1:
            result = await self._call_sap_abap_1(system_prompt, user_prompt)
        else:
            raise ValueError(f"Unknown model: {model}")

        # Parse the response
        generated_code = self._extract_code_blocks(result["content"])
        objects_modified = self._detect_modified_objects(generated_code, intent)
        confidence = self._estimate_confidence(result, intent)

        # Compute diff
        diff = ""
        if ctx.existing_source:
            diff = self._compute_diff(ctx.existing_source, generated_code)

        elapsed_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

        thinking.append(f"Generated {len(generated_code)} chars in {elapsed_ms}ms")
        thinking.append(f"Confidence: {confidence:.2f}")

        return GenerationResult(
            session_id=session_id,
            model_used=model,
            generated_code=generated_code,
            objects_modified=objects_modified,
            diff=diff,
            confidence=confidence,
            thinking=thinking,
            mcp_tools_used=["sap_search", "sap_read", "sap_table_structure"],
            tokens_used=result.get("tokens", 0),
            generation_time_ms=elapsed_ms,
        )

    # ─── STEP 5: Validate ───────────────────────────────────

    async def validate(
        self,
        result: GenerationResult,
        system_name: str,
    ) -> list[dict]:
        """Validate generated code by running syntax check + ATC via Agent."""
        issues = []

        # Syntax check
        if result.objects_modified:
            for obj in result.objects_modified:
                syntax_result = await self.agent.send_command(
                    "syntax_check", {
                        "source": result.generated_code,
                        "object_uri": f"/sap/bc/adt/oo/classes/{obj['name'].lower()}",
                        "system": system_name,
                    }
                )
                if syntax_result and "error" in syntax_result.lower():
                    issues.append({"type": "syntax", "detail": syntax_result})

                # ATC check
                atc_result = await self.agent.send_command(
                    "atc", {
                        "object_name": obj["name"],
                        "object_type": obj["type"],
                        "system": system_name,
                    }
                )
                if atc_result:
                    issues.append({"type": "atc", "detail": atc_result})

        return issues

    # ─── PROMPT BUILDING ────────────────────────────────────

    def _build_system_prompt(self, ctx: GenerationContext) -> str:
        """Build system-specific system prompt."""

        if ctx.system_type == "btp_abap_cloud":
            return """You are an expert SAP ABAP Cloud developer. You write code for BTP ABAP Environment.

Rules:
- Use ABAP Cloud syntax only (no classic statements like WRITE, AUTHORITY-CHECK old style)
- Use CDS View Entities (not DDIC views)
- Follow RAP (RESTful ABAP Programming) patterns
- Use Behavior Definitions for business logic
- Service Definitions + Bindings for OData exposure
- Inline declarations (DATA(...), FINAL(...))
- New ABAP syntax: VALUE #(), CORRESPONDING #(), FILTER #()
- String templates: |Hello { lv_name }|
- Access Controls for authorization
- Clean ABAP principles: small methods, meaningful names, no deep nesting

Output format:
- Return complete, compilable source code
- Mark each object with its type: [DDLS], [BDEF], [CLAS], [SRVD], [SRVB]
- Include all CDS annotations
- Include package and transport comments"""

        else:  # ECC
            return """You are an expert SAP ABAP developer for ECC 6.0 / S/4HANA on-premise.

Rules:
- Classic ABAP syntax is allowed
- Function Modules and BAPIs are available
- Use SELECT...ENDSELECT sparingly (prefer INTO TABLE)
- FOR ALL ENTRIES requires non-empty check
- Proper error handling with SY-SUBRC checks
- Use AUTHORITY-CHECK for authorization
- Comments in English
- Z-namespace for custom objects
- Proper ALV output (CL_SALV_TABLE or REUSE_ALV_*)

Output format:
- Return complete, compilable source code
- Mark each object with its type: [PROG], [CLAS], [FUGR], [TABL]
- Include TOP includes for global data if needed
- Include transport-relevant comments"""

    def _build_user_prompt(self, intent: ParsedIntent, ctx: GenerationContext) -> str:
        """Build the user prompt with full context."""
        parts = [f"Task: {intent.description}\n"]

        if ctx.existing_source:
            parts.append(f"Existing source code of {ctx.target_object} ({ctx.target_type}):")
            parts.append(f"```abap\n{ctx.existing_source}\n```\n")

        if ctx.related_objects:
            parts.append("Related objects in the system:")
            for obj in ctx.related_objects[:10]:
                parts.append(f"  - {obj['name']} ({obj['type']}) — {obj.get('description', '')}")
            parts.append("")

        if ctx.table_structures:
            parts.append("Table structures:")
            for tbl in ctx.table_structures:
                parts.append(f"  Table: {tbl['table']}")
                for fld in tbl.get("fields", [])[:20]:
                    key_marker = " [KEY]" if fld.get("key") else ""
                    parts.append(f"    - {fld['name']} ({fld['type']}){key_marker}: {fld.get('description', '')}")
            parts.append("")

        if intent.task_type == TaskType.RAP_STACK:
            parts.append("""Generate the complete RAP stack:
1. CDS View Entity (data model with associations)
2. Behavior Definition (managed, with draft if applicable)
3. Behavior Implementation (local handler class)
4. Service Definition
5. Service Binding (OData V4)
6. Access Control (basic authorization)""")

        parts.append("Return ONLY the code. No explanations unless asked.")
        return "\n".join(parts)

    # ─── AI CLIENT CALLS ────────────────────────────────────

    async def _call_claude(self, model: ModelChoice, system_prompt: str, user_prompt: str) -> dict:
        """Call Claude API."""
        client = self.ai_clients.get("claude")
        if not client:
            raise ValueError("Claude client not configured")

        model_id = "claude-opus-4-6" if model == ModelChoice.CLAUDE_OPUS else "claude-sonnet-4-5-20250929"

        response = await client.messages.create(
            model=model_id,
            max_tokens=8192,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )

        content = response.content[0].text if response.content else ""
        return {
            "content": content,
            "tokens": response.usage.input_tokens + response.usage.output_tokens,
        }

    async def _call_sap_abap_1(self, system_prompt: str, user_prompt: str) -> dict:
        """Call SAP-ABAP-1 model via customer's AI Core (through Agent).

        The AI Core call happens on the Client Agent side, not in the cloud.
        We send the prompt to the agent, which calls GenAI Hub locally.
        """
        result = await self.agent.send_command(
            "ai_generate", {
                "model": "sap-abap-1",
                "system_prompt": system_prompt,
                "user_prompt": user_prompt,
            }
        )
        return {"content": result or "", "tokens": 0}

    # ─── CODE PARSING ───────────────────────────────────────

    def _extract_code_blocks(self, response: str) -> str:
        """Extract ABAP code from AI response (strip markdown etc.)."""
        # Find ```abap ... ``` blocks
        blocks = re.findall(r'```(?:abap)?\s*\n(.*?)```', response, re.DOTALL)
        if blocks:
            return "\n\n".join(blocks)

        # If no code blocks, check if the response is all code
        if any(kw in response.upper() for kw in ["CLASS ", "METHOD ", "SELECT ", "DEFINE VIEW"]):
            return response.strip()

        return response

    def _detect_modified_objects(self, code: str, intent: ParsedIntent) -> list[dict]:
        """Detect which ABAP objects are created/modified in the generated code."""
        objects = []

        patterns = {
            "CLAS": r'(?:CLASS|class)\s+(z[a-z_0-9]+)',
            "DDLS": r'(?:define\s+view\s+entity|define\s+view)\s+(z[a-z_0-9]+)',
            "BDEF": r'(?:managed|unmanaged)\s+implementation\s+in\s+class\s+(z[a-z_0-9]+)',
            "PROG": r'(?:REPORT|report)\s+(z[a-z_0-9]+)',
            "INTF": r'(?:INTERFACE|interface)\s+(z[a-z_0-9]+)',
        }

        for obj_type, pattern in patterns.items():
            for match in re.finditer(pattern, code, re.IGNORECASE):
                name = match.group(1).upper()
                action = "modify" if name in [o.upper() for o in intent.target_objects] else "create"
                objects.append({"name": name, "type": obj_type, "action": action})

        return objects

    def _compute_diff(self, old_source: str, new_source: str) -> str:
        """Compute unified diff between old and new source."""
        import difflib
        old_lines = old_source.splitlines(keepends=True)
        new_lines = new_source.splitlines(keepends=True)
        diff = difflib.unified_diff(old_lines, new_lines, fromfile="before", tofile="after", lineterm="")
        return "\n".join(diff)

    def _estimate_confidence(self, result: dict, intent: ParsedIntent) -> float:
        """Estimate confidence score for the generation."""
        base = 0.85

        # Adjust based on task complexity
        if intent.complexity == "high":
            base -= 0.10
        elif intent.complexity == "low":
            base += 0.05

        # Adjust based on context availability
        if intent.target_objects:
            base += 0.03  # We had specific targets

        # Cap at 0-1
        return max(0.0, min(1.0, base))
