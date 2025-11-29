"""
Client ClickHouse async pour les événements time-series
"""
import clickhouse_connect
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.core.config import settings


class ClickHouseClient:
    """
    Client ClickHouse pour gérer les événements
    Utilise clickhouse-connect (plus stable que aioclickhouse)
    """

    def __init__(self):
        self.client = None
        self._initialized = False

    async def connect(self) -> None:
        """Initialiser la connexion ClickHouse"""
        try:
            # clickhouse-connect est synchrone mais très rapide
            self.client = clickhouse_connect.get_client(
                host=settings.CLICKHOUSE_HOST,
                port=settings.CLICKHOUSE_PORT,
                username=settings.CLICKHOUSE_USER,
                password=settings.CLICKHOUSE_PASSWORD,
                database=settings.CLICKHOUSE_DATABASE,
            )

            # Tester la connexion
            self.client.query("SELECT 1")
            self._initialized = True
            print(f"OK ClickHouse connected: {settings.CLICKHOUSE_HOST}:{settings.CLICKHOUSE_PORT}")

            # Créer les tables si elles n'existent pas
            await self._create_tables()

        except Exception as e:
            print(f"ERROR: ClickHouse connection failed: {e}")
            self._initialized = False

    async def _create_tables(self) -> None:
        """Créer les tables events si elles n'existent pas"""
        create_events_table = """
        CREATE TABLE IF NOT EXISTS events (
            id String,
            timestamp DateTime,
            camera_id String,
            event_type String,
            severity String,
            description String,
            acknowledged UInt8 DEFAULT 0,
            acknowledged_by String DEFAULT '',
            acknowledged_at Nullable(DateTime),
            metadata String DEFAULT '{}',
            frame_url String DEFAULT '',
            video_url String DEFAULT ''
        ) ENGINE = MergeTree()
        ORDER BY (timestamp, camera_id)
        PARTITION BY toYYYYMM(timestamp)
        TTL timestamp + INTERVAL 90 DAY
        """
        self.client.command(create_events_table)
        print("OK ClickHouse events table created/verified")

    async def disconnect(self) -> None:
        """Fermer la connexion ClickHouse"""
        if self.client:
            self.client.close()
            self._initialized = False
            print("OK ClickHouse connection closed")

    async def insert_event(self, event: Dict[str, Any]) -> bool:
        """
        Insérer un nouvel événement

        Args:
            event: Dictionnaire contenant les données de l'événement

        Returns:
            True si l'insertion a réussi
        """
        if not self._initialized:
            print("⚠️ ClickHouse not initialized, skipping event insert")
            return False

        try:
            data = [
                [
                    event.get("id"),
                    event.get("timestamp", datetime.utcnow()),
                    event.get("camera_id"),
                    event.get("event_type"),
                    event.get("severity", "medium"),
                    event.get("description", ""),
                    event.get("metadata", "{}"),
                    event.get("frame_url", ""),
                    event.get("video_url", ""),
                ]
            ]

            self.client.insert(
                table="events",
                data=data,
                column_names=[
                    "id", "timestamp", "camera_id", "event_type", "severity",
                    "description", "metadata", "frame_url", "video_url"
                ]
            )
            return True

        except Exception as e:
            print(f"❌ Error inserting event to ClickHouse: {e}")
            return False

    async def get_events(
        self,
        camera_id: Optional[str] = None,
        event_type: Optional[str] = None,
        severity: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        acknowledged: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        Récupérer les événements avec filtres

        Returns:
            Liste d'événements
        """
        if not self._initialized:
            return []

        try:
            # Construire la requête avec filtres
            conditions = []

            if camera_id:
                conditions.append(f"camera_id = '{camera_id}'")

            if event_type:
                conditions.append(f"event_type = '{event_type}'")

            if severity:
                conditions.append(f"severity = '{severity}'")

            if start_date:
                conditions.append(f"timestamp >= '{start_date.isoformat()}'")

            if end_date:
                conditions.append(f"timestamp <= '{end_date.isoformat()}'")

            if acknowledged is not None:
                conditions.append(f"acknowledged = {1 if acknowledged else 0}")

            where_clause = " AND ".join(conditions) if conditions else "1=1"

            query = f"""
            SELECT *
            FROM events
            WHERE {where_clause}
            ORDER BY timestamp DESC
            LIMIT {limit} OFFSET {offset}
            """

            result = self.client.query(query)
            return result.result_rows

        except Exception as e:
            print(f"❌ Error querying events from ClickHouse: {e}")
            return []

    async def get_event_stats(self) -> Dict[str, Any]:
        """
        Récupérer les statistiques globales des événements

        Returns:
            Dictionnaire avec les stats
        """
        if not self._initialized:
            return {}

        try:
            # Total events
            total_result = self.client.query("SELECT count() as total FROM events")
            total_events = total_result.result_rows[0][0] if total_result.result_rows else 0

            # Events aujourd'hui
            today_result = self.client.query("""
                SELECT count() as today
                FROM events
                WHERE toDate(timestamp) = today()
            """)
            events_today = today_result.result_rows[0][0] if today_result.result_rows else 0

            # Events 7 derniers jours
            week_result = self.client.query("""
                SELECT count() as week
                FROM events
                WHERE timestamp >= now() - INTERVAL 7 DAY
            """)
            events_last_7_days = week_result.result_rows[0][0] if week_result.result_rows else 0

            # Events par type
            type_result = self.client.query("""
                SELECT event_type, count() as count
                FROM events
                GROUP BY event_type
            """)
            events_by_type = {row[0]: row[1] for row in type_result.result_rows}

            # Events par sévérité
            severity_result = self.client.query("""
                SELECT severity, count() as count
                FROM events
                GROUP BY severity
            """)
            events_by_severity = {row[0]: row[1] for row in severity_result.result_rows}

            # Non acquittés
            unack_result = self.client.query("SELECT count() as unack FROM events WHERE acknowledged = 0")
            unacknowledged_count = unack_result.result_rows[0][0] if unack_result.result_rows else 0

            return {
                "total_events": total_events,
                "events_today": events_today,
                "events_last_7_days": events_last_7_days,
                "events_by_type": events_by_type,
                "events_by_severity": events_by_severity,
                "unacknowledged_count": unacknowledged_count,
            }

        except Exception as e:
            print(f"❌ Error getting event stats from ClickHouse: {e}")
            return {}


# Instance globale
clickhouse_client = ClickHouseClient()
