# StockScope frontend

Frontend SvelteKit untuk dashboard research Adobe Stock.

## Menjalankan lokal

```bash
npm install
npm run dev
```

Default API adalah `http://localhost:3000`. Untuk mengubahnya, buat `.env`:

```env
PUBLIC_API_BASE_URL=http://localhost:3000
```

## Validasi dan build

```bash
npm run check
npm run build
npm run preview
```

Halaman MVP:

- `/` — overview dan riwayat research
- `/research/new` — membuat research Images/Videos
- `/research/:id` — progress, hasil aset, filter, keyword, dan export CSV

UI menggunakan dark theme compact dengan komponen Tailwind bergaya shadcn-svelte. Keyword detail Adobe ditampilkan terpisah dari metadata search; jika crawler tidak berhasil membaca halaman detail, UI akan menampilkan empty state yang informatif.
