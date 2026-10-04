# நம்ம கடை food ordering website

- [Backend setup and API](food_ordering_backend/README.md)
- [Frontend setup](frontend/README.md)

Run the existing MySQL database and the FastAPI server on port 8000, then start the Vite frontend on port 5173. Alembic manages every table change. Everyone signs in at `/login`; new registrations have the `user` role. An administrator can manage roles and account status through the admin dashboard or the protected API.
