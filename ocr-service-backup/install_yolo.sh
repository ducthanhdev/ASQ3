#!/bin/bash
# Script to install YOLO dependencies step by step

echo "📦 Installing YOLO dependencies..."
echo ""

# Step 1: Install PyTorch CPU version (lighter, no CUDA needed for now)
echo "1️⃣ Installing PyTorch (CPU version)..."
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Step 2: Install ultralytics
echo ""
echo "2️⃣ Installing ultralytics..."
pip install ultralytics

# Step 3: Verify installation
echo ""
echo "3️⃣ Verifying installation..."
python3 -c "from ultralytics import YOLO; print('✅ Ultralytics installed successfully!')" && \
python3 -c "import torch; print('✅ PyTorch installed:', torch.__version__)" && \
echo "" && \
echo "🎉 All dependencies installed successfully!"

