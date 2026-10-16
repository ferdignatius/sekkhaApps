# `src/core/` — Infrastruktur Backend

Berisi **fondasi yang dipakai bersama** oleh semua modul backend: kontrak modul, event bus, dan type-system infrastruktur. Folder ini **bukan** modul fitur.

## Struktur

```
core/
├── types.ts                    ← Kontrak AppModule (interface)
└── eventbus/                   ← In-memory event bus + event definitions
    ├── eventbus.ts             # class EventBus singleton
    ├── events.ts               # Domain events + payload types
    └── index.ts                # Re-export publik
```

## `types.ts` — Kontrak `AppModule`

Setiap modul backend **wajib** mengimplementasi interface ini:

```ts
import type { Express } from "express"

interface AppModule {
  name: string                          // nama untuk logging
  register(app: Express): void          // mount routes
  subscribe?(): void                    // wire EventBus listeners
}
```

Dipakai oleh entry point (`src/index.ts`):

```ts
const modules: AppModule[] = [authModule, usersModule, eventsModule, ...]

modules.forEach(m => m.register(app))   // mount routes
modules.forEach(m => m.subscribe?.())   // subscribe ke events
```

## `eventbus/` — Pub/Sub In-Memory

Komunikasi antar-modul lewat **EventBus** (Node.js `EventEmitter` dibungkus). Skema:

```
publisher (modul A)         → eventbus.publish("user.registered", payload)
                                                       │
                                                       ▼
                                       EventEmitter.emit(event, payload)
                                                       │
                                       ┌───────────────┼───────────────┐
                                       ▼               ▼               ▼
                              subscriber A    subscriber B    subscriber C
```

### API Publik

```ts
import { eventbus } from "@/core/eventbus"

eventbus.publish<T>("event.name", payload)   // fire-and-forget
eventbus.subscribe<T>("event.name", async (payload) => { ... })
eventbus.unsubscribe<T>("event.name", handler)
```

### Event Definitions

File `events.ts` mendefinisikan **kontrak event**: nama event + tipe payload. Ini satu-satunya tempat event dideklarasikan (type-safety untuk publisher & subscriber).

```ts
// events.ts
export interface UserRegisteredPayload {
  userId: string
  email: string
  registeredAt: Date
}

// eventbus.ts
export const Events = {
  UserRegistered: "user.registered",
  AttendanceRecorded: "attendance.recorded",
  // ...
} as const
```

### Karakteristik

- **Loose-coupled.** Publisher tidak tahu subscriber; subscriber tidak tahu publisher.
- **Async handlers.** Subscriber jalan async; tidak memblokir publisher.
- **Try-catch per handler.** Satu handler yang gagal TIDAK menjatuhkan handler lain.
- **Singleton.** Satu instance di seluruh proses.

### Kapan Upgrade

EventBus ini cukup untuk arsitektur modular monolith. Saat butuh scale ke microservices, ganti implementasi dengan RabbitMQ / Redis Pub-Sub tanpa harus mengubah interface pemakai.

## Aturan

1. **Jangan tambah business logic di sini.** `core/` adalah infrastruktur murni.
2. **Setiap event HARUS punya type payload** di `events.ts` — tidak boleh `unknown`.
3. **Modul hanya boleh import dari `core/eventbus`** lewat re-export `index.ts`.
4. **Hindari listener yang berat.** Subscriber berat = blocking. Kalau ada proses panjang, offload ke queue/worker.

Lihat juga: `src/modules/README.md`, `src/lib/README.md`.