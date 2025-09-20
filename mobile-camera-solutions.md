# Mobile Camera Access Solutions

## Option 1: Use Chrome Mobile Developer Settings
1. Open Chrome on your mobile device
2. Go to `chrome://flags/` in the address bar
3. Search for "Insecure origins treated as secure"
4. Add `http://10.26.165.86:5173` to the list
5. Restart Chrome
6. Try the QR scanner again

## Option 2: Use Chrome's Force Enable Camera
1. In Chrome mobile, go to Settings > Site Settings > Camera
2. Make sure Camera is allowed
3. Add `http://10.26.165.86:5173` to allowed sites
4. Try the QR scanner

## Option 3: Use Local Tunnel (Recommended)
We can create a secure tunnel to your local server using ngrok or similar tools.

## Option 4: Use Alternative QR Methods
The app already has:
- Manual QR data entry (copy/paste)
- Image upload (take photo, then upload)
- File selection from gallery