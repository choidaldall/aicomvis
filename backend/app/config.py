"""Application configuration via pydantic-settings (reads from .env)."""

from pathlib import Path
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


# Project root = parent of backend/ (where this config.py lives at backend/app/)
# Works for: local dev (anywhere), and Docker where WORKDIR=/app and code at /app/app/
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def _default_dir(name: str) -> Path:
    """Return absolute path to a project-level directory, picking the right
    location whether running locally or inside the Docker container."""
    # Docker: /app/clips, /app/models exist as mounted volumes
    docker_path = Path("/app") / name
    if docker_path.exists():
        return docker_path
    return _PROJECT_ROOT / name


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # RTSP
    # No default credentials — set RTSP_URL in .env or send it via the API.
    rtsp_url: str = ""

    # Telegram
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""

    # Inference thresholds — calibrated for ST-GCN++ LDAM K-fold model
    fall_threshold: float = 0.45
    high_confidence_threshold: float = 0.70
    velocity_threshold: float = 0.5
    notification_cooldown_seconds: int = 30
    fps_target: int = 15

    # Storage — absolute paths, auto-detect Docker vs local
    clips_dir: Path = _default_dir("clips")
    models_dir: Path = _default_dir("models")
    max_clips_storage_gb: float = 5.0

    # Server
    api_port: int = 8000
    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:8000"]

    # Model filenames (relative to models_dir).
    # ST-GCN++ 4-stream production weights live as stgcn_prod_{J,B,JM,BM}.pth.
    yolo_pose_model: str = "yolo26s-pose.pt"
    age_gender_model: str = "age_gender_ver4_best.pt"
    glasses_model: str = "glasses_ver2_best.pt"

    # Lazy loading for Najla triage models
    lazy_load_triage_models: bool = True
    # Glasses model — disabled by default until v3 is delivered (v2 produces false positives).
    enable_glasses_model: bool = False

    # Camera name (shown in alerts)
    camera_name: str = "Ruang XG ITB"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors(cls, v):
        if isinstance(v, str):
            import json
            return json.loads(v)
        return v

    def model_path(self, name: str) -> Path:
        return self.models_dir / name


settings = Settings()
