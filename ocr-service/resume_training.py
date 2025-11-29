#!/usr/bin/env python3
"""
Resume YOLO training from the last checkpoint.
"""
import os
import sys

try:
    from ultralytics import YOLO
except ImportError:
    print("❌ ultralytics not installed.")
    sys.exit(1)

def main():
    last_checkpoint = "checkbox_model/asq3_checkbox/weights/last.pt"
    
    if not os.path.exists(last_checkpoint):
        print(f"❌ No checkpoint found: {last_checkpoint}")
        print("   Please start training first with: python3 train_yolo_gpu.py")
        sys.exit(1)
    
    print("🔄 Resuming YOLO training from last checkpoint...")
    print(f"📦 Checkpoint: {last_checkpoint}")
    print()
    
    # Load model from last checkpoint
    model = YOLO(last_checkpoint)
    
    # Resume training
    results = model.train(resume=True)
    
    # Copy best model if exists
    best_model_path = "checkbox_model/asq3_checkbox/weights/best.pt"
    if os.path.exists(best_model_path):
        import shutil
        shutil.copy(best_model_path, "checkbox_model/best.pt")
        print(f"\n✅ Training completed!")
        print(f"📦 Best model: checkbox_model/best.pt")
    
    return results

if __name__ == "__main__":
    main()

