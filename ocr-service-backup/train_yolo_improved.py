#!/usr/bin/env python3
"""
Improved YOLO training script with better parameters for checkbox detection.
Trains for more epochs with better augmentation.
"""
import os
import sys
import torch
from pathlib import Path

try:
    from ultralytics import YOLO
except ImportError:
    print("❌ ultralytics not installed. Install with: pip install ultralytics")
    sys.exit(1)

def train_yolo_improved():
    """Train YOLO model with improved parameters."""
    
    # Check dataset - try multiple possible paths
    possible_paths = [
        "asq3_real_yolo_dataset/data.yaml",  # From ocr-service directory
        "ocr-service/asq3_real_yolo_dataset/data.yaml",  # From root directory
    ]
    
    dataset_path = None
    for path in possible_paths:
        if os.path.exists(path):
            dataset_path = path
            break
    
    if dataset_path is None:
        print(f"❌ Dataset not found in any of these locations:")
        for path in possible_paths:
            print(f"   - {path}")
        print("\n   Please generate dataset first with:")
        print("   python3 ocr-service/generate_yolo_dataset_all_ages.py")
        sys.exit(1)
    
    print(f"✅ Dataset found: {dataset_path}")
    
    # Check for existing model - try multiple possible paths
    possible_model_dirs = [
        Path("checkbox_model"),  # From ocr-service directory
        Path("ocr-service/checkbox_model"),  # From root directory
    ]
    
    model_dir = None
    for md in possible_model_dirs:
        if md.exists():
            model_dir = md
            break
    
    if model_dir is None:
        model_dir = Path("checkbox_model")  # Default, will be created
    
    best_model = model_dir / "best.pt"
    last_model = model_dir / "asq3_checkbox" / "weights" / "last.pt"
    
    # Determine starting point
    if last_model.exists():
        print(f"📦 Found last checkpoint: {last_model}")
        try:
            # Check if training is completed
            checkpoint = torch.load(last_model, map_location='cpu', weights_only=False)
            epoch = checkpoint.get('epoch', 0)
            epochs = checkpoint.get('epochs', 100)
            
            if epoch >= epochs:
                print(f"⚠️  Training already completed (epoch {epoch}/{epochs})")
                if best_model.exists():
                    print(f"📦 Starting new training from best model: {best_model}")
                    model_path = str(best_model)
                else:
                    print(f"📦 Resuming from last checkpoint: {last_model}")
                    model_path = str(last_model)
            else:
                print(f"📦 Resuming training from epoch {epoch}/{epochs}")
                model_path = str(last_model)
        except Exception as e:
            print(f"⚠️  Could not read checkpoint: {e}")
            if best_model.exists():
                print(f"📦 Starting from best model: {best_model}")
                model_path = str(best_model)
            else:
                print("📦 Starting from YOLOv8n pretrained model")
                model_path = "yolov8n.pt"
    elif best_model.exists():
        print(f"📦 Found best model: {best_model}")
        print("📦 Starting new training from best model")
        model_path = str(best_model)
    else:
        # Try to find yolov8n.pt in current dir or ocr-service dir
        yolo_models = ["yolov8n.pt", "ocr-service/yolov8n.pt"]
        model_path = None
        for yolo_path in yolo_models:
            if os.path.exists(yolo_path):
                model_path = yolo_path
                break
        
        if model_path is None:
            print("📦 Starting from YOLOv8n pretrained model (will download)")
            model_path = "yolov8n.pt"
        else:
            print(f"📦 Starting from YOLOv8n pretrained model: {model_path}")
    
    # Load model
    print(f"\n📦 Loading model: {model_path}")
    model = YOLO(model_path)
    
    # Training parameters - optimized for checkbox detection
    print("\n🚀 Starting training with improved parameters...")
    print("   - Epochs: 50 (more than quick training)")
    print("   - Batch size: 4 (GPU memory optimized)")
    print("   - Image size: 800 (matches inference)")
    print("   - Augmentation: Enabled (flip, mosaic, etc.)")
    print("   - Learning rate: Auto (with warmup)")
    
    try:
        results = model.train(
            data=dataset_path,
            epochs=50,
            imgsz=800,
            batch=4,
            device=0 if torch.cuda.is_available() else 'cpu',
            project="checkbox_model",
            name="asq3_checkbox",
            patience=10,  # Early stopping if no improvement for 10 epochs
            save=True,
            save_period=10,  # Save checkpoint every 10 epochs
            val=True,
            plots=True,
            # Augmentation
            hsv_h=0.015,  # Hue augmentation
            hsv_s=0.7,    # Saturation augmentation
            hsv_v=0.4,    # Value augmentation
            degrees=10,   # Rotation augmentation
            translate=0.1,  # Translation augmentation
            scale=0.5,    # Scale augmentation
            flipud=0.0,   # No vertical flip (checkboxes should stay upright)
            fliplr=0.5,   # Horizontal flip (50% chance)
            mosaic=1.0,   # Mosaic augmentation (100% chance)
            mixup=0.1,    # Mixup augmentation (10% chance)
            copy_paste=0.1,  # Copy-paste augmentation (10% chance)
        )
        
        print("\n" + "="*70)
        print("✅ Training completed!")
        print("="*70)
        print(f"📦 Best model: {model_dir / 'asq3_checkbox' / 'weights' / 'best.pt'}")
        print(f"📦 Last checkpoint: {model_dir / 'asq3_checkbox' / 'weights' / 'last.pt'}")
        
        if hasattr(results, 'results_dict'):
            print("\n📊 Training metrics:")
            for key, value in results.results_dict.items():
                if isinstance(value, (int, float)):
                    print(f"   {key}: {value:.4f}")
        
    except KeyboardInterrupt:
        print("\n⚠️  Training interrupted by user")
        print(f"📦 Checkpoint saved at: {model_dir / 'asq3_checkbox' / 'weights' / 'last.pt'}")
        print("   You can resume training by running this script again")
    except Exception as e:
        print(f"\n❌ Training failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    train_yolo_improved()

