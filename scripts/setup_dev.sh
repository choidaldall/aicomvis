#!/usr/bin/env bash
# First-time dev setup: create backend/.env from template with local paths,
# verify model symlinks, and copy LSTM config from pifr_lstm if needed.
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# 1. Create backend/.env if missing
if [[ ! -f backend/.env ]]; then
    echo "Creating backend/.env from template..."
    cp backend/.env.example backend/.env
    # Override Docker paths with local absolute paths
    sed -i "s|^CLIPS_DIR=.*|CLIPS_DIR=${PROJECT_ROOT}/clips|" backend/.env
    sed -i "s|^MODELS_DIR=.*|MODELS_DIR=${PROJECT_ROOT}/models|" backend/.env
    echo "  backend/.env created. Edit it to set TELEGRAM_BOT_TOKEN, RTSP_URL, etc."
else
    echo "backend/.env already exists, skipping"
fi

# 2. Verify model symlinks
for f in yolo26s-pose.pt lstm_best.pth age_gender_ver4_best.pt glasses_ver2_best.pt; do
    if [[ ! -e "models/$f" ]]; then
        echo "WARNING: models/$f missing — set up the symlink"
    fi
done

# 3. Copy LSTM config if not present
if [[ ! -f models/lstm_config.yaml ]]; then
    src="$HOME/pifr_lstm/best_model_final/config.yaml"
    if [[ -f "$src" ]]; then
        cp "$src" models/lstm_config.yaml
        echo "Copied LSTM config from $src"
    else
        echo "WARNING: LSTM config not found at $src"
    fi
fi

# 4. Ensure clips/ exists
mkdir -p clips

echo "Setup complete. Run:"
echo "  source ~/pifr_lstm/pifr_lstm_env/bin/activate"
echo "  cd backend && uvicorn app.main:app --port 8000 --reload"
