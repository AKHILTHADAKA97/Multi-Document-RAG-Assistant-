# Multi-Document RAG Assistant - Frontend

A modern React + TypeScript frontend for the Multi-Document RAG Assistant, built with Vite, Tailwind CSS, and React Router.

## Features

- **Document Management**: Upload, list, delete, and retry PDF documents
- **Chat Interface**: Ask questions with source citations and page references
- **Multi-Document Selection**: Filter search by specific documents
- **Real-time Health Checks**: Monitor backend service status
- **Dark/Light Theme**: System-aware theme with manual toggle
- **Responsive Design**: Works on desktop and mobile
- **Accessible**: ARIA labels, keyboard navigation, semantic HTML

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API communication
- **Lucide React** for icons

## Getting Started

### Prerequisites

- Node.js 18+
- Backend API running on `http://localhost:8000`

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:3000` with API proxy to `http://localhost:8000`.

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
frontend/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Input.tsx
│   │   ├── Textarea.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── ChatInput.tsx
│   │   ├── DocumentCard.tsx
│   │   ├── FileUpload.tsx
│   │   ├── Header.tsx
│   │   ├── MultiSelectDropdown.tsx
│   │   └── Toast.tsx
│   ├── hooks/          # Custom React hooks
│   │   ├── useChat.ts
│   │   ├── useDocuments.ts
│   │   ├── useHealthCheck.ts
│   │   └── useTheme.ts
│   ├── pages/          # Page components
│   │   ├── DocumentsPage.tsx
│   │   └── ChatPage.tsx
│   ├── types/          # TypeScript types
│   │   └── index.ts
│   ├── utils/          # Utility functions
│   │   ├── api.ts
│   │   └── helpers.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── postcss.config.js
```

## API Integration

The frontend communicates with the backend via the `/api/v1` prefix. The Vite dev server proxies API requests to `http://localhost:8000`.

### Key Endpoints Used

- `GET /api/v1/health` - Health check
- `GET /api/v1/ready` - Readiness check
- `POST /api/v1/documents/upload` - Upload PDFs
- `GET /api/v1/documents` - List documents
- `DELETE /api/v1/documents/{id}` - Delete document
- `POST /api/v1/documents/{id}/retry` - Retry failed document
- `POST /api/v1/chat/query` - Ask a question

## Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

## Customization

### Theme Colors

Edit `tailwind.config.js` to customize the color palette:

```js
theme: {
  extend: {
    colors: {
      brand: {
        500: '#your-brand-color',
        // ...
      }
    }
  }
}
```

### Adding New Components

1. Create component in `src/components/`
2. Export from component file
3. Import and use in pages

## Design Principles

- **Human-centered**: Feels crafted, not generated
- **Consistent**: Shared design tokens via Tailwind
- **Accessible**: WCAG AA compliant
- **Performant**: Code-split, lazy-loaded, optimized
- **Maintainable**: Clear separation of concerns

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT