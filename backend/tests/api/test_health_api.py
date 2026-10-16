import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch, Mock


class TestHealthAPI:
    @pytest.mark.asyncio
    async def test_health_endpoint(self, async_client: AsyncClient):
        response = await async_client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "1.0.0"

    @pytest.mark.asyncio
    async def test_ready_endpoint(self, async_client: AsyncClient):
        with patch("app.api.v1.endpoints.health.get_vector_store") as mock_vs:
            mock_store = Mock()
            mock_store.health_check.return_value = True
            mock_vs.return_value = mock_store

            response = await async_client.get("/api/v1/ready")
            assert response.status_code == 200
            data = response.json()
            assert data["ready"] is True
            assert data["database"] is True
            assert data["vector_store"] is True