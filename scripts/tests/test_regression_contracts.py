import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]


class RegressionContractsTest(unittest.TestCase):
    def test_loot_client_uses_existing_python_endpoint(self) -> None:
        # ADR-008: app/api/generate-loot and app/api/loot (Next.js routes)
        # were deleted because output: "export" (GitHub Pages static hosting)
        # can't run route handlers that read request.url at runtime. The
        # browser now calls python-service directly via loot-client.ts.
        client = (REPO_ROOT / "lib" / "game" / "loot-client.ts").read_text(
            encoding="utf-8"
        )
        self.assertIn("/loot/roll?", client)
        self.assertIn("NEXT_PUBLIC_PYTHON_SERVICE_URL", client)

    def test_roll_loot_timeout_is_cleared_in_finally(self) -> None:
        game = (REPO_ROOT / "lib" / "game" / "game.ts").read_text(encoding="utf-8")
        self.assertIn("const timer = setTimeout(() => abort.abort(), 3000);", game)
        self.assertIn("finally {", game)
        self.assertIn("clearTimeout(timer);", game)


if __name__ == "__main__":
    unittest.main()
