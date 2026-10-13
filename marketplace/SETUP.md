# Pure Pail Dairy Admin: setup and testing (Windows PowerShell)

## Install and run
```powershell
cd marketplace
npm install react-router-dom axios lucide-react react-hot-toast
Copy-Item .env.example .env
npm run dev
```
Start the Flask backend first (it must listen on `http://127.0.0.1:5000`), then open the URL Vite prints (usually http://localhost:5173/admin/login).
The Vite proxy forwards `/api` (plus `/uploads` and `/static` for images) to Flask.

Copy the files from this package over your `src/`, `index.html` and `vite.config.js`. The old `App.css`/`index.css` are no longer used.

## Backend assumptions to verify
- `GET /api/products/admin/all` exists and returns `{ "products": [], "total": 0 }`.
- Products expose `id, name, category, description, price, stock_quantity, unit, is_available` and an image URL in `image_url` (also tried: `image`, `image_path`). Adjust `productImage()` in `src/utils/product.js` if yours differs.
- `/api/auth/refresh` returns `access_token`; `/api/auth/me` returns the user (or `{ user }`).
- Flask CORS is not needed in dev because requests go through the proxy.

## Test checklist
1. **Setup page**: open `/admin/setup`. It only explains the process and never calls the API.
2. **Login**: valid admin goes to `/admin/dashboard`. Wrong password shows "Incorrect email or password". Empty fields show inline errors.
3. **Authorization**: log in with a customer account. Access is denied with a clear message and no session is kept. Visit `/admin/products` while signed out: redirected to login. Also confirm the backend returns 403 for a customer token on `/api/products/admin/all`.
4. **Dashboard stats**: compare the four cards with the rows in `/admin/products` (total, available with stock > 0, stock = 0, sum of stock).
5. **Create**: add a product with and without an image. Try invalid input (negative price, 3 decimals, 6 MB file, .gif) and check inline errors. In DevTools > Network confirm the request is `multipart/form-data` with a boundary.
6. **Edit**: change stock and keep the image; then replace the image. Edit an out-of-stock product.
7. **Delete**: confirm dialog names the product; Cancel keeps it; Delete removes it and refreshes stats. Stop Flask and retry to see the error toast with the product kept.
8. **Images**: thumbnails load in the table, mobile cards and edit page.
9. **Refresh**: after login, shorten the JWT access lifetime in Flask (or wait for expiry) and load the catalog. One `POST /api/auth/refresh` should occur, then the original request retries once. Reload the browser tab: the session is restored from the refresh cookie.
10. **Logout**: Logout from the sidebar or profile menu calls `POST /api/auth/logout`, returns to login, and the back button cannot reopen protected pages.
11. **Responsive/a11y**: resize under 860 px (drawer, product cards, no horizontal scroll); tab through every page and check focus rings.
