# Grilli - Online Food Ordering and Table Reservation Platform

The original Grilli website (HTML, CSS, JS, images) with a Node.js + Express backend added.
`grilli/assets/css/style.css` and the page layout are unchanged.

## Run (Windows / VS Code)

```
npm install
npm start
```

Open http://localhost:5050

First start creates `backend/data/db.json` with dummy data. To reset the data (also needed after editing `backend/config/owner.js`): `npm run seed`.
Node 18 or newer is needed.

## Logins

| Role | Email | Password |
|------|-------|----------|
| Admin | hrishitarout9@gmail.com (set in `backend/config/owner.js`) | Admin@123 |
| Customer | aarav@example.com | Customer@123 |

Admin panel: http://localhost:5050/admin.html

## What works

Customer side
- Menu loads from the database, with category filter and search
- Cart (floating button), checkout (dine-in / takeaway / delivery), demo online payment or pay at venue
- Register / login (JWT, bcrypt passwords)
- Table reservation form saves to the database
- Contact form and footer newsletter box save to the database
- My Account: order history with progress bar, booking status

Admin (`admin.html`)
- Dashboard: orders, revenue, average order, reservations, customers, 7-day revenue chart, top dishes
- Orders and reservations: filter, change status, delete
- Menu: add, edit, hide, delete dishes
- Payments: collected / outstanding, change payment status
- Messages and subscribers, customer list

## Structure

```
Grilli/
  grilli/                original website + login.html, cart.html, account.html, admin.html
    assets/css/dineflow.css    styling for the new parts only
    assets/js/dineflow.js      API client, cart, menu loading, form handlers
  backend/
    server.js
    config/db.js, seed.js
    models/   User, Menu, Order, Reservation, Contact
    routes/   auth, menu, orders, reservations, contact, admin
    middleware/auth.js
    data/db.json             created on first run
```

## API

| Method | Route | Access |
|--------|-------|--------|
| POST | /api/auth/register, /api/auth/login | public |
| GET | /api/auth/me | logged in |
| GET | /api/menu | public |
| POST/PUT/DELETE | /api/menu, /api/menu/:id | admin |
| POST | /api/orders | logged in |
| GET | /api/orders/mine | logged in |
| GET/PATCH/DELETE | /api/orders, /api/orders/:id | admin |
| POST | /api/reservations | public |
| GET | /api/reservations/mine | logged in |
| GET/PATCH/DELETE | /api/reservations, /api/reservations/:id | admin |
| POST | /api/contact, /api/contact/subscribe | public |
| GET/PATCH/DELETE | /api/contact | admin |
| GET | /api/admin/stats, /api/admin/customers | admin |

## Notes

- Database is a local JSON file, so no MongoDB install is needed. Models and routes are separate, so moving to MongoDB + Mongoose later only touches `config/db.js` and `models/`.
- Online payment is a demo (no Razorpay keys, no real money).
- Set `JWT_SECRET` and `PORT` as environment variables before deploying.
- If you open `index.html` through Live Server (port 5500), the pages still call the API on http://localhost:5050, so the backend must be running.
