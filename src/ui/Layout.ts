import { html } from 'hono/html'

export const Layout = ({ title, children }: { title: string, children: string }) => html`
<!DOCTYPE html>
<html>
<head>
  <title>${title} | AbleAway</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .badge-yes { @apply bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium; }
    .badge-no { @apply bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium; }
    .status-success { @apply bg-green-100 text-green-800 px-2 py-1 rounded text-xs; }
    .status-failed { @apply bg-red-100 text-red-800 px-2 py-1 rounded text-xs; }
    .status-pending { @apply bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs; }
  </style>
</head>
<body class="bg-gray-50 min-h-screen">
  <nav class="bg-white shadow-sm border-b">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-center items-center h-16">
        <h1 class="text-2xl font-bold text-gray-900">♿ AbleAway</h1>
      </div>
    </div>
  </nav>
  
  <main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
    ${children}
  </main>
</body>
</html>
`