import tempfile
import unittest
import zipfile
from pathlib import Path

from em_analyzer.config import Config
from em_analyzer.api import CaseFile, ComplianceCase
from em_analyzer.runner import AnalyzerRunner


class FakeClient:
    def __init__(self, case):
        self.case = case
        self.statuses = []
        self.requirements = []

    def pending_cases(self):
        return [self.case]

    def update_case_status(self, case_id, status, highest_risk=None):
        self.statuses.append((status, highest_risk))

    def download(self, file, destination):
        xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:body><w:p><w:r><w:t>應符合CNS 14674，過載150%持續1分鐘。</w:t></w:r></w:p></w:body>
        </w:document>'''.encode("utf-8")
        with zipfile.ZipFile(destination, "w") as archive:
            archive.writestr("word/document.xml", xml)

    def save_results(self, case, requirements):
        self.requirements.extend(requirement for _, requirement in requirements)


class RunnerTests(unittest.TestCase):
    def test_processes_pending_case_and_writes_report(self):
        case = ComplianceCase(
            id="4170d834-d60e-8180-a8fb-f9374ff18851",
            name="16266變頻器",
            systems=["電力"],
            candidates=[{"brand": "ABB"}],
            files=[CaseFile("16266變頻器.docx", "https://example.test/file.docx")],
        )
        with tempfile.TemporaryDirectory() as temp_dir:
            config = Config(
                api_base="https://example.test/api",
                analyzer_token="test-token",
                data_dir=Path(temp_dir),
                poll_seconds=60,
            )
            client = FakeClient(case)
            runner = AnalyzerRunner(config, client=client)

            failures = runner.run_once()

            self.assertEqual(failures, 0)
            self.assertEqual(client.statuses[0], ("分析中", None))
            self.assertEqual(client.statuses[-1][0], "待覆核")
            self.assertTrue(any(item.standard_ref == "CNS 14674" for item in client.requirements))
            self.assertTrue(list((Path(temp_dir) / "reports").glob("*.json")))
            self.assertTrue(list((Path(temp_dir) / "completed").glob("*/16266變頻器.docx")))


if __name__ == "__main__":
    unittest.main()
