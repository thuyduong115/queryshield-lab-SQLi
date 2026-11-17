"""L3 least privilege, measured live from the PostgreSQL catalog for the adapter role."""

from pydantic import BaseModel

from queryshield_api.config import Settings
from queryshield_api.db.connection import app_connection
from queryshield_api.db.schema import QUERY_ROLE

PROBED_TABLES = (
    "demo.users",
    "demo.products",
    "demo.orders",
    "demo.profiles",
    "demo.tickets",
    "lab.runs",
    "lab.security_events",
    "lab.observations",
)
PROBED_PRIVILEGES = ("SELECT", "INSERT", "UPDATE", "DELETE")


class TablePrivileges(BaseModel):
    table: str
    granted: list[str]


class RoleReport(BaseModel):
    role: str
    superuser: bool
    can_create_db: bool
    can_create_role: bool
    settings: list[str]
    tables: list[TablePrivileges]


def probe_query_role(settings: Settings) -> RoleReport:
    with app_connection(settings) as conn:
        role = conn.execute(
            "SELECT rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = %s",
            (QUERY_ROLE,),
        ).fetchone()
        role_settings = conn.execute(
            "SELECT unnest(s.setconfig) AS setting FROM pg_db_role_setting s "
            "JOIN pg_roles r ON r.oid = s.setrole WHERE r.rolname = %s ORDER BY 1",
            (QUERY_ROLE,),
        ).fetchall()
        tables = []
        for table in PROBED_TABLES:
            granted = [
                privilege
                for privilege in PROBED_PRIVILEGES
                if conn.execute(
                    "SELECT has_table_privilege(%s, %s, %s) AS ok",
                    (QUERY_ROLE, table, privilege),
                ).fetchone()["ok"]
            ]
            tables.append(TablePrivileges(table=table, granted=granted))
    return RoleReport(
        role=QUERY_ROLE,
        superuser=role["rolsuper"],
        can_create_db=role["rolcreatedb"],
        can_create_role=role["rolcreaterole"],
        settings=[row["setting"] for row in role_settings],
        tables=tables,
    )
