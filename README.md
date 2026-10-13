# 🏠 RentFlow — Smart Rental Property Management

**Simplify property management. Streamline rent tracking. Manage maintenance with ease.**

RentFlow is a web-based rental property management platform designed to simplify the way property owners and tenants manage rental operations. It brings property-related workflows into one place, helping reduce manual work and improve transparency between landlords and tenants.

🌐 **Live Demo:** [RentFlow](https://rent-flow-mauve.vercel.app/)

📂 **Source Code:** [GitHub Repository](https://github.com/mshrshivam/Rent-Flow)

---

## ✨ Key Features

- 🏢 **Property Management** — Manage rental properties and organize property-related information.
- 💰 **Rent Management** — Simplify rent-related operations and keep rental records organized.
- 📄 **Digital Agreements** — Support agreement-related workflows and document management.
- 🔧 **Maintenance Management** — Organize maintenance requests and property service workflows.
- 🤖 **AI-Powered Assistance** — Integrate AI-assisted functionality into property management workflows.
- 👥 **Tenant Management** — Keep tenant-related information organized and accessible.
- 📊 **Centralized Dashboard** — Access important property management information through a unified interface.
- 🔐 **Database Integration** — Connect application workflows with backend services and persistent data storage.
- 📱 **Responsive Interface** — Built with a modern frontend for a smooth user experience across screen sizes.

## 🛠️ Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui

### Backend
- Node.js
- Express.js
- REST APIs

### Database & Services
- Supabase
- PostgreSQL

### Tools & Deployment
- Git & GitHub
- Vercel

## 🏗️ Project Structure

```text
Rent-Flow/
├── public/          # Static assets
├── src/             # Frontend application
├── server/          # Backend services and API routes
├── supabase/        # Database and Supabase configuration
├── package.json     # Project dependencies and scripts
└── README.md        # Project documentation
```

## 🚀 Getting Started

### Prerequisites

Make sure you have installed:

- Node.js
- npm
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/mshrshivam/Rent-Flow.git
```

### 2. Navigate to the Project

```bash
cd Rent-Flow
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the appropriate project directory and add the environment variables required by your frontend, backend, and database configuration.

```env
DATABASE_URL=your_database_url
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

Add any additional variables required by your application. Never commit real credentials, API keys, or secrets to GitHub.

### 5. Start the Development Server

```bash
npm run dev
```

Check `package.json` for the available scripts and follow the appropriate instructions to start the backend separately if required.

## 🔒 Security

- Keep sensitive credentials in environment variables.
- Never expose service-role keys or private API keys in frontend code.
- Validate and authorize requests on the server.
- Configure database access policies according to your application's security requirements.

## 🎯 Project Goals

RentFlow aims to make rental property management more organized and accessible by bringing essential property workflows into a single digital platform.

The project focuses on simplifying day-to-day operations, improving information accessibility, and reducing dependence on scattered manual records.

## 🔮 Future Enhancements

- Automated rent reminders and payment tracking
- Property analytics and reporting
- Enhanced tenant and owner dashboards
- Agreement expiry notifications
- Improved maintenance request tracking
- Additional AI-assisted property management capabilities

## 👨‍💻 Author

**Shivam Kumar Mishra**

- GitHub: [@mshrshivam](https://github.com/mshrshivam)

---

⭐ If you find this project interesting, consider starring the repository!

