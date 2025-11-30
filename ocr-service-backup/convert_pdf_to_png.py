"""
Convert PDF to PNG images using PyMuPDF (fitz).
"""
import os
import sys
import fitz  # PyMuPDF
from PIL import Image
import io

def convert_pdf_to_png(pdf_path: str, output_dir: str = "asq3_pdf_pages", dpi: int = 200, use_pdf_name: bool = False):
    """
    Convert PDF pages to PNG images.
    
    Args:
        pdf_path: Path to PDF file
        output_dir: Output directory for PNG files
        dpi: Resolution (DPI) for output images
        use_pdf_name: If True, create subdirectory with PDF name
    """
    # Check if file exists
    if not os.path.exists(pdf_path):
        print(f"❌ Error: File not found: {pdf_path}")
        print(f"   Current directory: {os.getcwd()}")
        return False
    
    # Get PDF name for subdirectory
    pdf_name = os.path.splitext(os.path.basename(pdf_path))[0] if use_pdf_name else None
    if pdf_name:
        final_output_dir = os.path.join(output_dir, pdf_name)
    else:
        final_output_dir = output_dir
    
    # Create output directory
    os.makedirs(final_output_dir, exist_ok=True)
    
    try:
        # Open PDF
        pdf_doc = fitz.open(pdf_path)
        total_pages = pdf_doc.page_count
        print(f"📄 {os.path.basename(pdf_path)}: {total_pages} pages")
        
        # Calculate zoom factor for desired DPI (default is 72 DPI)
        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)
        
        # Convert each page
        for page_num in range(total_pages):
            page = pdf_doc[page_num]
            
            # Render page to image
            pix = page.get_pixmap(matrix=mat)
            
            # Convert to PIL Image
            img_data = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_data))
            
            # Save
            output_path = os.path.join(final_output_dir, f"{page_num}.png")
            img.save(output_path)
            print(f"  ✓ Page {page_num + 1}/{total_pages} → {output_path}")
        
        pdf_doc.close()
        print(f"✔ Converted → {final_output_dir}/\n")
        return True
        
    except Exception as e:
        print(f"❌ Error converting {pdf_path}: {e}")
        import traceback
        traceback.print_exc()
        return False


def convert_directory(pdf_dir: str, output_base_dir: str = "asq3_pdf_pages", dpi: int = 200):
    """
    Convert all PDF files in a directory.
    
    Args:
        pdf_dir: Directory containing PDF files
        output_base_dir: Base output directory
        dpi: Resolution (DPI) for output images
    """
    if not os.path.isdir(pdf_dir):
        print(f"❌ Error: Directory not found: {pdf_dir}")
        return False
    
    # Find all PDF files
    pdf_files = [f for f in os.listdir(pdf_dir) if f.lower().endswith('.pdf')]
    pdf_files.sort()
    
    if not pdf_files:
        print(f"❌ No PDF files found in {pdf_dir}")
        return False
    
    print(f"📁 Found {len(pdf_files)} PDF files in {pdf_dir}\n")
    print("=" * 60)
    
    success_count = 0
    failed_count = 0
    
    for i, pdf_file in enumerate(pdf_files, 1):
        pdf_path = os.path.join(pdf_dir, pdf_file)
        print(f"\n[{i}/{len(pdf_files)}] Processing: {pdf_file}")
        print("-" * 60)
        
        if convert_pdf_to_png(pdf_path, output_base_dir, dpi, use_pdf_name=True):
            success_count += 1
        else:
            failed_count += 1
    
    print("\n" + "=" * 60)
    print(f"✅ Summary: {success_count} succeeded, {failed_count} failed")
    return success_count > 0


if __name__ == "__main__":
    # Check command line arguments
    if len(sys.argv) > 1:
        input_path = sys.argv[1]
        
        # Check if it's a directory or file
        if os.path.isdir(input_path):
            # Convert all PDFs in directory
            print(f"📁 Converting all PDFs in directory: {input_path}\n")
            success = convert_directory(input_path)
            sys.exit(0 if success else 1)
        elif os.path.isfile(input_path):
            # Convert single file
            success = convert_pdf_to_png(input_path)
            sys.exit(0 if success else 1)
        else:
            print(f"❌ Error: Path not found: {input_path}")
            sys.exit(1)
    else:
        # No arguments - try to find PDF directory or single file
        pdf_dir = "pdf"
        pdf_paths = [
            "../backend/tmp/ASQ-3_ 6 months - Test Filled.pdf",  # Test file (có sẵn)
            "ASQ-3_ 6 months - Test Filled.pdf",
            "ASQ3 - Assessment System.pdf",  # Template file (cần có để tạo dataset)
            "../ASQ3 - Assessment System.pdf",
        ]
        
        # Check if pdf/ directory exists
        if os.path.isdir(pdf_dir):
            print(f"📁 Found PDF directory: {pdf_dir}")
            print("Converting all PDFs in directory...\n")
            success = convert_directory(pdf_dir)
            sys.exit(0 if success else 1)
        
        # Try to find single PDF file
        pdf_path = None
        for path in pdf_paths:
            if os.path.exists(path):
                pdf_path = path
                break
        
        if not pdf_path:
            print("❌ No PDF file or directory found.")
            print("\nUsage:")
            print("   python3 convert_pdf_to_png.py <path_to_pdf>          # Convert single file")
            print("   python3 convert_pdf_to_png.py <path_to_directory>    # Convert all PDFs in directory")
            print("   python3 convert_pdf_to_png.py                         # Auto-detect (looks for pdf/ directory)")
            print("\nTried locations:")
            print(f"   {'✓' if os.path.isdir(pdf_dir) else '✗'} {pdf_dir}/ (directory)")
            for path in pdf_paths:
                exists = "✓" if os.path.exists(path) else "✗"
                print(f"   {exists} {path}")
            sys.exit(1)
        
        # Convert single file
        success = convert_pdf_to_png(pdf_path)
        sys.exit(0 if success else 1)
