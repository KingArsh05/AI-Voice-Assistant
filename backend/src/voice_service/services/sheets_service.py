import gspread
from google.oauth2.service_account import Credentials

from ..config import Config


HEADERS = [
    "Timestamp",
    "Call UUID",
    "Customer Name",
    "Phone Number",
    "Duration (s)",
    "Call Outcome",
    "Blocker",
    "Travel Dates",
    "Nights",
    "Guests",
    "Budget Stated",
    "Callback Date/Time",
    "Competitor",
    "Verbatim Reason",
    "Human Follow-up",
    "Summary",
    "Transcription",
]


class SheetsService:
    def __init__(self):
        self._sheet = None

    @property
    def sheet(self):
        if self._sheet is None:
            try:
                scopes = [
                    "https://www.googleapis.com/auth/spreadsheets",
                    "https://www.googleapis.com/auth/drive",
                ]
                credentials = Credentials.from_service_account_file(
                    Config.GOOGLE_SERVICE_ACCOUNT_FILE,
                    scopes=scopes,
                )
                self.client = gspread.authorize(credentials)
                self._sheet = self.client.open_by_key(Config.GOOGLE_SHEET_ID).sheet1
                self._ensure_headers()
            except Exception as e:
                print(f"Warning: Could not connect to Google Sheets ({e}). Will retry on next request.")
                return None
        return self._sheet

    def _ensure_headers(self):
        if not self._sheet:
            return
        try:
            existing_row1 = self._sheet.row_values(1)
            if not existing_row1 or existing_row1 != HEADERS:
                if existing_row1:
                    self._sheet.insert_row(HEADERS, index=1)
                else:
                    self._sheet.append_row(HEADERS)
                try:
                    self._sheet.format("A1:Q1", {"textFormat": {"bold": True}})
                except Exception:
                    pass
        except Exception as e:
            print(f"Warning: Failed to ensure sheet headers: {e}")

    def append_call(self, data):
        if not self.sheet:
            print("Google Sheets not connected; skipping row append.")
            return
        def _clean_str(val):
            if val is None or val == "None":
                return ""
            if isinstance(val, bool):
                return "Yes" if val else "No"
            return str(val).strip()

        # Transcription can be a list of turn dicts — serialize it as plain text for Sheets
        raw_transcript = data.get("transcription") or ""
        if isinstance(raw_transcript, list):
            import json
            transcript_str = json.dumps(raw_transcript, ensure_ascii=False)
        else:
            transcript_str = str(raw_transcript)

        row = [
            _clean_str(data.get("timestamp")),
            _clean_str(data.get("call_uuid")),
            _clean_str(data.get("customer_name")),
            _clean_str(data.get("phone_number")),
            _clean_str(data.get("duration")),
            _clean_str(data.get("call_outcome")),
            _clean_str(data.get("blocker")),
            _clean_str(data.get("travel_dates")),
            _clean_str(data.get("nights")),
            _clean_str(data.get("guests")),
            _clean_str(data.get("budget_stated")),
            _clean_str(data.get("callback_datetime")),
            _clean_str(data.get("competitor_named")),
            _clean_str(data.get("verbatim_reason")),
            _clean_str(data.get("human_followup_needed")),
            _clean_str(data.get("summary")),
            transcript_str,
        ]

        self.sheet.append_row(row)

    def read_all_calls(self) -> dict:
        if not self.sheet:
            return {}
        try:
            all_rows = self.sheet.get_all_values()
            if not all_rows or len(all_rows) <= 1:
                return {}

            # Skip header row (index 0)
            rows = all_rows[1:]
            result = {}
            for r in rows:
                if not r or len(r) < 2:
                    continue

                call_uuid = r[1].strip()
                if not call_uuid:
                    continue

                def _get(idx):
                    return r[idx].strip() if idx < len(r) else ""

                # Try to parse transcription back from JSON if stored as list
                raw_t = _get(16)
                try:
                    import json as _json
                    parsed_t = _json.loads(raw_t) if raw_t.strip().startswith("[") else raw_t
                except Exception:
                    parsed_t = raw_t

                result[call_uuid] = {
                    "timestamp": _get(0),
                    "call_uuid": call_uuid,
                    "customer_name": _get(2),
                    "phone_number": _get(3),
                    "duration": _get(4),
                    "call_outcome": _get(5),
                    "blocker": _get(6),
                    "travel_dates": _get(7),
                    "nights": _get(8),
                    "guests": _get(9),
                    "budget_stated": _get(10) or None,
                    "callback_datetime": _get(11) or None,
                    "competitor_named": _get(12) or None,
                    "verbatim_reason": _get(13),
                    "human_followup_needed": _get(14),
                    "summary": _get(15),
                    "transcription": parsed_t,
                }
            return result
        except Exception as e:
            print(f"Error reading calls from Google Sheets: {e}")
            return {}