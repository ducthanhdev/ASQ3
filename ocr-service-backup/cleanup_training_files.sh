#!/bin/bash
# Script để xóa các file training không cần thiết

echo "🧹 Cleaning up training files..."
echo ""

# 1. Xóa training runs cũ (giữ lại asq3_checkbox - run đang dùng)
echo "1️⃣ Removing old training runs..."
echo "   Keeping: checkbox_model/asq3_checkbox/ (active run)"
if [ -d "checkbox_model/asq3_checkbox_finetune" ]; then
    echo "   Removing: checkbox_model/asq3_checkbox_finetune/"
    rm -rf checkbox_model/asq3_checkbox_finetune
fi

if [ -d "checkbox_model/asq3_checkbox2" ]; then
    echo "   Removing: checkbox_model/asq3_checkbox2/"
    rm -rf checkbox_model/asq3_checkbox2
fi

# 2. Xóa cache
echo ""
echo "2️⃣ Removing cache files..."
if [ -d ".ultralytics" ]; then
    echo "   Removing: .ultralytics/"
    rm -rf .ultralytics
fi

if [ -d "__pycache__" ]; then
    echo "   Removing: __pycache__/"
    find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
fi

# 3. Xóa training outputs không cần (giữ lại results.png)
echo ""
echo "3️⃣ Removing unnecessary training outputs..."
find checkbox_model -name "*.jpg" -type f -delete 2>/dev/null
find checkbox_model -name "train_batch*.jpg" -type f -delete 2>/dev/null
find checkbox_model -name "val_batch*.jpg" -type f -delete 2>/dev/null

# 4. Xóa old epoch checkpoints (giữ lại best.pt và last.pt)
echo ""
echo "4️⃣ Removing old epoch checkpoints..."
find checkbox_model -name "epoch*.pt" -type f -delete 2>/dev/null

echo ""
echo "✅ Cleanup completed!"
echo ""
echo "📊 Remaining files:"
du -sh checkbox_model 2>/dev/null
echo ""
echo "💾 Files kept:"
echo "   ✅ checkbox_model/best.pt"
find checkbox_model -name "best.pt" -o -name "last.pt" 2>/dev/null | head -5
