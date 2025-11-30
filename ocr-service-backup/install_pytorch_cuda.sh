#!/bin/bash
echo "🔧 Installing PyTorch with CUDA support for RTX 3050..."
echo "📦 CUDA Version: 13.0 (detected from nvidia-smi)"
echo ""

# Uninstall CPU-only PyTorch
echo "🗑️  Uninstalling CPU-only PyTorch..."
pip uninstall -y torch torchvision torchaudio

# Install PyTorch with CUDA 12.1 (compatible with CUDA 13.0)
echo "📥 Installing PyTorch with CUDA 12.1 support..."
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

echo ""
echo "✅ Installation complete!"
echo ""
echo "🔍 Verifying installation..."
python3 -c "import torch; print('✅ PyTorch:', torch.__version__); print('✅ CUDA available:', torch.cuda.is_available()); print('✅ GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None')"

