#!/usr/bin/env python3
"""
Fine-tune YOLO model with lower learning rate to improve confidence.
This is better for improving detection confidence on existing good model.
"""
import os
import sys

try:
    from ultralytics import YOLO
    import torch
except ImportError:
    print("❌ ultralytics or torch not installed.")
    print("   Run: bash install_yolo.sh")
    sys.exit(1)

def main():
    data_yaml = "asq3_real_yolo_dataset/data.yaml"
    best_model = "checkbox_model/best.pt"
    
    if not os.path.exists(data_yaml):
        print(f"❌ Dataset not found: {data_yaml}")
        print("   Please run: python3 generate_yolo_dataset_all_ages.py")
        sys.exit(1)
    
    if not os.path.exists(best_model):
        print(f"❌ Best model not found: {best_model}")
        print("   Please train first with: python3 train_yolo_gpu.py")
        sys.exit(1)
    
    # Check GPU availability
    use_gpu = torch.cuda.is_available()
    device = 'cuda' if use_gpu else 'cpu'
    gpu_name = torch.cuda.get_device_name(0) if use_gpu else "CPU"
    
    print("🎯 Fine-tuning YOLO model to improve confidence...")
    print(f"📁 Dataset: {data_yaml}")
    print(f"📦 Starting from: {best_model}")
    print(f"🖥️  Device: {device.upper()} ({gpu_name})")
    print()
    
    # Load best model
    model = YOLO(best_model)
    
    # Fine-tuning parameters (lower learning rate, more epochs)
    if use_gpu:
        print("🖼️  Image size: 800")
        print("🔄 Epochs: 100 (fine-tuning)")
        print("📊 Batch size: 4")
        print("📉 Learning rate: 0.0001 (lower for fine-tuning)")
        print("⚡ Estimated time: ~1.5-3 hours")
        imgsz = 800
        batch = 4
        epochs = 100
        lr0 = 0.0001  # Lower initial learning rate
    else:
        print("🖼️  Image size: 640")
        print("🔄 Epochs: 50 (fine-tuning)")
        print("📊 Batch size: 2")
        print("📉 Learning rate: 0.0001 (lower for fine-tuning)")
        print("⏱️  Estimated time: ~3-4 hours")
        imgsz = 640
        batch = 2
        epochs = 50
        lr0 = 0.0001
    
    print()
    print("💡 Fine-tuning with lower learning rate will:")
    print("   - Improve detection confidence")
    print("   - Reduce false positives")
    print("   - Better generalization")
    print()
    
    # Fine-tune training
    results = model.train(
        data=data_yaml,
        imgsz=imgsz,
        epochs=epochs,
        batch=batch,
        lr0=lr0,  # Lower learning rate for fine-tuning
        name="asq3_checkbox_finetune",  # New name for fine-tuned model
        project="checkbox_model",
        exist_ok=True,
        save=True,
        plots=True,
        device=device,
        cache=False,
        workers=2 if use_gpu else 0,
        amp=True if use_gpu else False,
        resume=False,  # Start from best.pt
    )
    
    # Copy best model
    best_model_path = "checkbox_model/asq3_checkbox_finetune/weights/best.pt"
    if os.path.exists(best_model_path):
        import shutil
        # Backup old model
        if os.path.exists("checkbox_model/best.pt"):
            shutil.copy("checkbox_model/best.pt", "checkbox_model/best.pt.backup")
        # Copy new fine-tuned model
        shutil.copy(best_model_path, "checkbox_model/best.pt")
        print(f"\n✅ Fine-tuning completed!")
        print(f"📦 Best model: checkbox_model/best.pt")
        print(f"💾 Old model backed up: checkbox_model/best.pt.backup")
        print()
        print("🧪 Test the improved model:")
        print("   python3 test_yolo_model.py")
    else:
        print(f"\n⚠️  Check checkbox_model/ directory for trained model")
    
    return results

if __name__ == "__main__":
    main()

