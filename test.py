from rembg import remove
from PIL import Image
import io

# Load image
input_path = r"C:\Users\SAHIL\Downloads\Gemini_Generated_Image_5bvajf5bvajf5bva.jpeg" # Replace with your image path
output_path = r"C:\Users\SAHIL\Downloads\without_bg.jpeg"  # Output will be PNG with transparency

# Open the image and convert it to RGBA
with open(input_path, 'rb') as input_file:
    input_data = input_file.read()

# Remove background
output_data = remove(input_data)

# Save the result
with open(output_path, 'wb') as output_file:
    output_file.write(output_data)

print(f"Background removed and saved to {output_path}")
