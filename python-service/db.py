"""Runtime DB access for player identity + run persistence (ADR-009).

Short-lived connections against DATABASE_URL_POOLED - Neon's own PgBouncer
already pools at the proxy layer, so this doesn't run a second pool on top
of it. Migrations (alembic/) use DATABASE_URL_DIRECT instead; see
alembic/env.py for why.

Plain sync psycopg, matching the rest of this service (no other endpoint is
async) - FastAPI runs sync route handlers in a threadpool, so this doesn't
block the event loop.
"""

import os

import psycopg
from psycopg.rows import dict_row


def get_connection() -> psycopg.Connection:
    url = os.environ["DATABASE_URL_POOLED"]
    return psycopg.connect(url, row_factory=dict_row, autocommit=True)
