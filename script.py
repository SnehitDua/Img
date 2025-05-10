import requests

# Set this to your local image file path
image_path = r"C:\Users\SAHIL\Downloads\WhatsApp Image 2025-05-08 at 05.46.09_9eadbc45.jpg"
username = 'admin'

with open(image_path, 'rb') as img_file:
    files = {'profile': img_file}
    data = {'username': username}
    
    response = requests.post('http://localhost:5000/profile-pic', files=files, data=data)

print('Status:', response.status_code)
print('Response:', response.json())
