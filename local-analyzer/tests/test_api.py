import unittest
from pathlib import Path
from unittest.mock import patch

from em_analyzer.api import AnalyzerApiClient
from em_analyzer.config import Config


class FakeResponse:
    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self):
        return b'{"token":"session-token"}'


class ApiMappingTests(unittest.TestCase):
    def test_parses_case_files_systems_and_candidates(self):
        payload = {
            "id": "case-id",
            "caseName": "16266變頻器",
            "systems": ["電力"],
            "candidates": [{"brand": "ABB"}],
            "files": [{"name": "16266變頻器.docx", "url": "https://example.test/file.docx"}],
        }

        case = AnalyzerApiClient._parse_case(payload)

        self.assertEqual(case.name, "16266變頻器")
        self.assertEqual(case.systems, ["電力"])
        self.assertEqual(case.candidates, [{"brand": "ABB"}])
        self.assertEqual(case.files[0].name, "16266變頻器.docx")

    @patch("urllib.request.urlopen", return_value=FakeResponse())
    def test_login_uses_browser_compatible_headers(self, urlopen):
        config = Config(
            api_base="https://example.test/api",
            username="analyzer",
            password="test-password",
            data_dir=Path("data"),
            poll_seconds=60,
        )
        client = AnalyzerApiClient(config)

        client.login()

        request = urlopen.call_args.args[0]
        self.assertIn("Mozilla/5.0", request.get_header("User-agent"))
        self.assertEqual(request.get_header("Accept"), "application/json")
        self.assertEqual(client.token, "session-token")


if __name__ == "__main__":
    unittest.main()
