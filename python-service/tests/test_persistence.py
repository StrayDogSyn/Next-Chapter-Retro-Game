"""Integration tests for /players/register, /save, /load (ADR-009).

Runs against the real database configured via .env (DATABASE_URL_POOLED) -
there's no test-DB isolation in this project yet. Each test generates its
own random UUID(s) and deletes the rows it created in tearDown, so repeated
runs never accumulate junk in the real table.
"""

import os
import sys
import unittest
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient

from db import get_connection
from main import app


class PersistenceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)
        self._created_uuids: list[str] = []

    def tearDown(self) -> None:
        if not self._created_uuids:
            return
        with get_connection() as conn:
            conn.execute(
                "DELETE FROM players WHERE client_uuid = ANY(%s)",
                (self._created_uuids,),
            )

    def _register(self, client_uuid: str) -> dict:
        self._created_uuids.append(client_uuid)
        resp = self.client.post("/players/register", json={"client_uuid": client_uuid})
        self.assertEqual(resp.status_code, 200)
        return resp.json()

    def test_registration_is_idempotent(self) -> None:
        client_uuid = str(uuid.uuid4())
        first = self._register(client_uuid)
        second = self._register(client_uuid)
        self.assertEqual(first["playerId"], second["playerId"])

    def test_two_uuids_produce_isolated_run_state(self) -> None:
        uuid_a = str(uuid.uuid4())
        uuid_b = str(uuid.uuid4())
        self._register(uuid_a)
        self._register(uuid_b)

        self.client.post(
            "/save", json={"client_uuid": uuid_a, "save_data": {"version": 1, "roomId": "R01"}}
        )
        self.client.post(
            "/save", json={"client_uuid": uuid_b, "save_data": {"version": 1, "roomId": "R09"}}
        )

        load_a = self.client.get("/load", params={"client_uuid": uuid_a}).json()
        load_b = self.client.get("/load", params={"client_uuid": uuid_b}).json()

        self.assertEqual(load_a["saveData"]["roomId"], "R01")
        self.assertEqual(load_b["saveData"]["roomId"], "R09")

    def test_load_before_any_save_returns_ok_false(self) -> None:
        client_uuid = str(uuid.uuid4())
        self._register(client_uuid)
        resp = self.client.get("/load", params={"client_uuid": client_uuid})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), {"ok": False, "saveData": None})

    def test_save_without_registration_is_rejected(self) -> None:
        client_uuid = str(uuid.uuid4())  # deliberately not registered/tracked
        resp = self.client.post(
            "/save", json={"client_uuid": client_uuid, "save_data": {"version": 1}}
        )
        self.assertEqual(resp.status_code, 404)

    def test_save_upserts_rather_than_duplicating_rows(self) -> None:
        client_uuid = str(uuid.uuid4())
        self._register(client_uuid)
        self.client.post(
            "/save", json={"client_uuid": client_uuid, "save_data": {"version": 1, "coins": 1}}
        )
        self.client.post(
            "/save", json={"client_uuid": client_uuid, "save_data": {"version": 1, "coins": 2}}
        )
        with get_connection() as conn:
            row = conn.execute(
                """
                SELECT count(*) AS n FROM run_state
                WHERE player_id = (SELECT id FROM players WHERE client_uuid = %s)
                """,
                (client_uuid,),
            ).fetchone()
        self.assertEqual(row["n"], 1)
        load = self.client.get("/load", params={"client_uuid": client_uuid}).json()
        self.assertEqual(load["saveData"]["coins"], 2)

    def test_oversized_save_payload_is_rejected(self) -> None:
        client_uuid = str(uuid.uuid4())
        self._register(client_uuid)
        # ADR-012: MAX_SAVE_BODY_BYTES is 64KB - pad well past it.
        oversized = {"version": 1, "padding": "x" * (70 * 1024)}
        resp = self.client.post("/save", json={"client_uuid": client_uuid, "save_data": oversized})
        self.assertEqual(resp.status_code, 413)


if __name__ == "__main__":
    unittest.main()
