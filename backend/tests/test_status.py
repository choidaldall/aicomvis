"""Tests for system status endpoint."""
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client_online():
    """TestClient with all systems reporting online."""
    rtsp_mock = MagicMock()
    rtsp_mock.is_connected = True
    tg_mock = MagicMock()
    tg_mock.enabled = True

    state = {
        "rtsp_consumer": rtsp_mock,
        "yolo": MagicMock(),
        "lstm": MagicMock(),
        "telegram": tg_mock,
        "start_time": 0.0,
    }

    with patch("app.main.app_state", state), \
         patch("app.main.clip_store", MagicMock()), \
         patch("shutil.disk_usage") as mock_disk:
        mock_disk.return_value = MagicMock(free=50 * 1024**3)
        from app.main import app
        yield TestClient(app)


def test_status_online(client_online):
    r = client_online.get("/api/status")
    assert r.status_code == 200
    data = r.json()
    assert data["camera"] == "online"
    assert data["model_yolo"] == "loaded"
    assert data["model_lstm"] == "loaded"
    assert data["telegram"] == "connected"
    assert data["disk_free_gb"] > 0


@pytest.fixture()
def client_offline():
    """TestClient with camera and telegram offline."""
    state = {
        "rtsp_consumer": None,
        "yolo": None,
        "lstm": None,
        "telegram": None,
        "start_time": 0.0,
    }

    with patch("app.main.app_state", state), \
         patch("app.main.clip_store", MagicMock()), \
         patch("shutil.disk_usage") as mock_disk:
        mock_disk.return_value = MagicMock(free=50 * 1024**3)
        from app.main import app
        yield TestClient(app)


def test_status_offline(client_offline):
    r = client_offline.get("/api/status")
    assert r.status_code == 200
    data = r.json()
    assert data["camera"] == "offline"
    assert data["model_yolo"] == "error"
    assert data["telegram"] == "disconnected"
