# Vyason Backend

## Chatbot setup

The chatbot is mounted at `/api/chatbot`. It reuses the existing MongoDB
`Product`, `Order`, `Shipment`, `Store`, `User`, and `Cart` models and existing
JWT authentication. Copy `.env.example` to `.env`, set the MongoDB URI, JWT
secret, OpenAI key, and the frontend origin. Use Node.js 22 or newer (required by the installed OpenAI SDK),
then run `npm install` and
`npm start`. The OpenAI client is only initialized when an AI request is made;
catalog search and order lookups remain database-backed.

### Chatbot endpoints

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/chatbot/session` | Guest or JWT | Create a chat session ID |
| POST | `/api/chatbot/message` | Guest or JWT | Send a message; creates a session ID when omitted |
| GET | `/api/chatbot/history?sessionId=...&page=1&limit=20` | Session owner | Paginated session messages |
| GET | `/api/chatbot/conversations?page=1&limit=20` | JWT | Paginated signed-in user's conversations |
| DELETE | `/api/chatbot/conversation/:id` | Conversation owner | Delete by Mongo conversation ID; guests must also pass `sessionId` |
| POST | `/api/chatbot/product-search` | Guest or JWT | Search the live catalog; accepts filters or a natural-language query |
| POST | `/api/chatbot/recommendations` | Guest or JWT | Recommend active, in-stock catalog products |
| POST | `/api/chatbot/order-status` | JWT | List recent orders or look up one by `orderNumber` |

Chat responses include `success`, `sessionId`, `conversationId`, `message`,
`intent`, `products`, and `suggestions` (`reply` is retained as a compatibility alias). Invalid or
expired bearer tokens are rejected rather than downgraded to guest access.
Authenticated users can add products through the existing
`POST /api/cart` endpoint; it resolves product and variant pricing from MongoDB
and does not accept a client-supplied price. Cart quantity changes and removal
remain available through the existing authenticated cart routes.

The chatbot uses a 15-request-per-minute rate limit. Conversation history is
limited to 40 messages and MongoDB expires inactive conversations after seven
days. Product results only come from active product records, and order data is
always queried with the authenticated user's ID.