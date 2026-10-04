# நம்ம கடை frontend

React, Vite, React Router, Axios, and one responsive stylesheet. Catalog, ratings, orders, fees, and admin statistics come from the existing FastAPI backend.

## Run locally

Start the FastAPI backend on port 8000, then run:

```powershell
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. Set `VITE_API_URL` in `.env` if the API is served elsewhere. The default is the current browser host on port 8000.

Everyone signs in at `/login` and reaches `/dashboard`. New registrations always have the `user` role. Once an existing admin grants the `admin` role, that account can use `/admin` and manage user roles and active status at `/admin/users`. The food editor uploads JPEG, PNG, or WebP images to `POST /api/foods/{id}/image`. The backend serves saved images from `/uploads`. Empty catalogs show empty states. Checkout uses the backend's cart preview, delivery fee, cash on delivery, and order endpoints.

Run `npm run build` to verify the production bundle.
