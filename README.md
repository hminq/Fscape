# Fscape

Student accommodation management system built with Node.js, Express.js, PostgreSQL, React, PayOS, and Pinecone.

Fscape supports the full student housing lifecycle, from room discovery and booking to deposit payment, contract signing, resident management, service requests, invoices, checkout, and AI-assisted accommodation search.

## Functions

- Browse buildings, rooms, facilities, room types, prices, and availability.
- Create room bookings with deposit payment through PayOS.
- Auto-generate contracts after successful deposit payment.
- Support customer and building manager digital contract signing.
- Generate first-rent invoices and manage room status transitions automatically.
- Authenticate users with email/password, access/refresh tokens, and Google OAuth2.
- Manage role-based access for Admin, Building Manager, Staff, Resident, and Customer users.
- Manage buildings, rooms, assets, facilities, contracts, invoices, requests, users, and audit logs from the admin dashboard.
- Handle resident service requests, including repair, cleaning, complaint, asset change, checkout, and other request types.
- Generate recurring rent and service invoices through scheduled jobs.
- Send booking, contract, invoice, payment, and operational emails through background workers.
- Upload and serve room, building, profile, request, and contract assets through S3 and CloudFront.
- Provide a Pinecone-based RAG chatbot with LLM integration, scheduled knowledge sync, vector upserts, and privacy-safe data filtering.

## Tech Stack

### Backend

- Node.js
- Express.js
- Sequelize
- PostgreSQL
- JWT access/refresh tokens
- Google OAuth2
- PayOS payment integration
- Pinecone vector database
- LLM integration
- SQS background queues
- S3 for object storage
- Nodemailer for transactional emails
- Puppeteer for PDF generation
- node-cron scheduled jobs

### Frontend

- Vite
- React
- JavaScript
- Tailwind CSS
- HeroUI
- shadcn/ui
- React Router
- Framer Motion
- Lucide React
- Three.js
- MapLibre GL

## Cloud And Infrastructure

- **Frontend:** Amplify + CloudFront
- **Backend:** EC2 + Docker Compose
- **Reverse proxy:** nginx
- **Database:** PostgreSQL
- **Queues:** SQS
- **Object storage:** S3
- **CDN for uploads:** CloudFront
- **Secrets:** AWS Secrets Manager
- **Container registry:** ECR
- **CI/CD:** GitHub Actions
