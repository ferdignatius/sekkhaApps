# `src/hooks/` — Global Hooks

Hook React yang dipakai di **lebih dari satu modul** dan tidak punya business logic modul tertentu. Untuk hook spesifik modul, taruh di `modules/<x>/internal/hooks/`.

## Daftar Saat Ini

| File | Fungsi |
|------|--------|
| `useDebounce.ts` | Debounce nilai (untuk input search, dsb.) |
| `use-mobile.ts` | Deteksi viewport mobile (breakpoint Tailwind `md`) |

## Kapan Tambah di Sini vs `modules/<x>/internal/hooks/`

| Skenario | Lokasi |
|----------|--------|
| Dipakai oleh 2+ modul | ✅ `src/hooks/` |
| Spesifik untuk satu modul | `modules/<x>/internal/hooks/` |
| Provider / context level atas | `src/hooks/` (atau bikin context di `lib/`) |
| React patterns generik (debounce, throttle, dsb.) | `src/hooks/` |

## Aturan

1. **Hook di sini harus benar-benar generik** — tidak ada referensi ke entity domain (Event, User, dll.).
2. **Boleh import dari `lib/`**, tidak boleh import dari `modules/`.
3. **Testable** — hook di sini semestinya punya unit test (lihat skill `test-driven-development`).
4. **Naming**: awalan `use`, camelCase, deskriptif. Contoh: `useDebounce`, `useLocalStorage`, `useMediaQuery`.

## Contoh: `useDebounce`

```tsx
import { useDebounce } from "@/hooks/useDebounce"

const [search, setSearch] = useState("")
const debouncedSearch = useDebounce(search, 300)

useEffect(() => {
  if (debouncedSearch) fetchResults(debouncedSearch)
}, [debouncedSearch])
```

Lihat juga: `src/lib/README.md`, `src/modules/README.md`.