"""SAP GUI Scripting Connector — Legacy Fallback.

Uses COM automation to control SAP GUI on Windows.
This is the LAST RESORT when ADT and RFC are not available.

Use cases:
  - SEGW (Gateway Service Builder) — no ADT API
  - SAPscript forms — no ADT API
  - Smartforms — limited ADT support
  - CMOD/SMOD enhancements — no ADT for some operations
  - Older ECC systems without ADT activated

Requirements:
  - Windows only (COM/win32com)
  - SAP GUI for Windows installed
  - GUI Scripting enabled in SAP (RZ11 → sapgui/user_scripting = TRUE)
  - SAP GUI session must be open
"""
from __future__ import annotations

import logging
import time
from typing import Optional

logger = logging.getLogger(__name__)


class GUIScriptingConnector:
    """SAP GUI Scripting via COM automation.

    ⚠ This connector is fragile and slow. Use ADT or RFC whenever possible.
    ⚠ Requires SAP GUI to be open with an active session.
    ⚠ Windows only.
    """

    def __init__(self):
        self._sap_gui = None
        self._session = None
        self._connected = False

    async def connect(self, connection_index: int = 0, session_index: int = 0) -> None:
        """Connect to an open SAP GUI session via COM."""
        try:
            import win32com.client
        except ImportError:
            raise RuntimeError(
                "win32com not available. Install: pip install pywin32\n"
                "GUI Scripting is only supported on Windows."
            )

        try:
            sap_gui_auto = win32com.client.GetObject("SAPGUI")
            application = sap_gui_auto.GetScriptingEngine
            connection = application.Children(connection_index)
            self._session = connection.Children(session_index)
            self._connected = True
            logger.info(f"GUI Scripting connected: {self._session.Info.SystemName}")
        except Exception as e:
            raise RuntimeError(
                f"Could not connect to SAP GUI: {e}\n"
                "Make sure SAP GUI is open and GUI Scripting is enabled (RZ11)."
            )

    async def disconnect(self) -> None:
        """Release COM objects."""
        self._session = None
        self._connected = False

    def _check_connected(self):
        if not self._connected or not self._session:
            raise RuntimeError("Not connected to SAP GUI. Call connect() first.")

    # ─── TRANSACTION NAVIGATION ─────────────────────────────

    async def run_transaction(self, tcode: str) -> None:
        """Navigate to a transaction code."""
        self._check_connected()
        self._session.StartTransaction(tcode)
        time.sleep(0.5)  # Wait for screen load
        logger.debug(f"Transaction: {tcode}")

    async def press_enter(self) -> None:
        self._check_connected()
        self._session.findById("wnd[0]").sendVKey(0)
        time.sleep(0.3)

    async def press_f8(self) -> None:
        """Press F8 (Execute)."""
        self._check_connected()
        self._session.findById("wnd[0]").sendVKey(8)
        time.sleep(0.5)

    # ─── FIELD ACCESS ───────────────────────────────────────

    async def set_field(self, field_id: str, value: str) -> None:
        """Set a value in a GUI field.

        Args:
            field_id: SAP GUI element ID (e.g., "wnd[0]/usr/ctxtRS38M-PROGRAMM")
            value: Value to set
        """
        self._check_connected()
        try:
            element = self._session.findById(field_id)
            element.text = value
        except Exception as e:
            logger.error(f"Could not set field {field_id}: {e}")
            raise

    async def get_field(self, field_id: str) -> str:
        """Read a value from a GUI field."""
        self._check_connected()
        try:
            element = self._session.findById(field_id)
            return element.text
        except Exception as e:
            logger.error(f"Could not read field {field_id}: {e}")
            return ""

    async def click_button(self, button_id: str) -> None:
        """Click a button in the GUI."""
        self._check_connected()
        self._session.findById(button_id).press()
        time.sleep(0.5)

    # ─── READ SOURCE VIA SE38 ───────────────────────────────

    async def read_report_source(self, report_name: str) -> str:
        """Read report source code via SE38 transaction.

        Fallback when ADT and RFC_READ_REPORT are not available.
        """
        self._check_connected()

        # Navigate to SE38
        await self.run_transaction("SE38")

        # Enter report name
        await self.set_field("wnd[0]/usr/ctxtRS38M-PROGRAMM", report_name)

        # Click "Source Code" / Display
        await self.click_button("wnd[0]/usr/btnRSED-SACT")
        time.sleep(1)

        # Read the editor content
        try:
            editor = self._session.findById("wnd[0]/usr/cntlEDITOR1/shellcont/shell")
            # Get all lines
            lines = []
            for i in range(editor.LineCount):
                lines.append(editor.GetLineText(i))
            return "\n".join(lines)
        except Exception as e:
            logger.error(f"Could not read editor content: {e}")
            return ""

    # ─── SMARTFORMS VIA SE71 ────────────────────────────────

    async def read_smartform_info(self, form_name: str) -> dict:
        """Read Smartform metadata via SMARTFORMS transaction."""
        self._check_connected()
        await self.run_transaction("SMARTFORMS")
        await self.set_field("wnd[0]/usr/ctxtSFIFC-SMART_FORM", form_name)
        await self.click_button("wnd[0]/usr/btnDISPLAY")
        time.sleep(2)

        # Get form description from status bar or title
        title = self._session.findById("wnd[0]").text
        return {"name": form_name, "title": title, "status": "read via GUI"}

    # ─── SEGW SERVICE BUILDER ───────────────────────────────

    async def read_segw_service(self, service_name: str) -> dict:
        """Read OData service metadata from SEGW (Gateway Service Builder).

        SEGW has no ADT API — GUI Scripting is the only automated access.
        """
        self._check_connected()
        await self.run_transaction("SEGW")
        time.sleep(1)

        # SEGW uses a tree control — navigation is complex
        # This is a simplified version
        return {
            "name": service_name,
            "status": "SEGW requires manual inspection — GUI automation limited",
            "note": "Consider migrating to RAP-based OData services",
        }

    # ─── CMOD / SMOD ───────────────────────────────────────

    async def read_enhancement(self, enhancement_name: str, transaction: str = "CMOD") -> dict:
        """Read customer enhancement (CMOD) or SAP enhancement (SMOD)."""
        self._check_connected()
        await self.run_transaction(transaction)
        await self.set_field("wnd[0]/usr/ctxtMODACT-NAME", enhancement_name)
        await self.click_button("wnd[0]/usr/btnDISPLAY")
        time.sleep(1)

        title = self._session.findById("wnd[0]").text
        return {
            "name": enhancement_name,
            "type": transaction,
            "title": title,
        }

    # ─── SCREENSHOT (for debugging) ─────────────────────────

    async def take_screenshot(self, filepath: str) -> str:
        """Take a screenshot of the current SAP GUI screen."""
        self._check_connected()
        try:
            self._session.findById("wnd[0]").HardCopy(filepath, "PNG")
            return filepath
        except Exception as e:
            logger.error(f"Screenshot failed: {e}")
            return ""

    # ─── STATUS BAR ─────────────────────────────────────────

    async def get_status_message(self) -> dict:
        """Read the SAP status bar message."""
        self._check_connected()
        try:
            statusbar = self._session.findById("wnd[0]/sbar")
            return {
                "type": statusbar.MessageType,  # S=Success, E=Error, W=Warning, I=Info
                "text": statusbar.Text,
            }
        except Exception:
            return {"type": "", "text": ""}
