# Especificación Técnica y Funcional

## 1. Modelo de Datos (PostgreSQL / Supabase Schema)

```sql
-- Familias / Clubes
create table clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text default 'EUR',
  created_at timestamp with time zone default now()
);

-- Perfiles de usuario (Padres / Hijos)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  club_id uuid references clubs(id) on delete cascade,
  full_name text not null,
  role text check (role in ('admin', 'member')) default 'member',
  avatar_url text,
  virtual_balance numeric(12,2) default 0.00,
  created_at timestamp with time zone default now()
);

-- Asignaciones mensuales o periódicas otorgadas
create table allocations (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references clubs(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  amount numeric(10,2) not null,
  period text not null, -- ej: '2026-10'
  note text,
  status text check (status in ('pending', 'invested')) default 'pending',
  created_at timestamp with time zone default now()
);

-- Carteras disponibles propuestas por el club/padres
create table portfolios (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references clubs(id) on delete cascade,
  name text not null, -- ej: 'Tecnología Global', 'Indexado S&P 500', 'Dividendos & Valor'
  description text,
  risk_level int check (risk_level between 1 and 5),
  asset_allocation jsonb, -- distribución de valores
  created_at timestamp with time zone default now()
);

-- Posiciones / Inversiones de cada miembro
create table investments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  portfolio_id uuid references portfolios(id) on delete cascade,
  shares numeric(12,4) not null,
  avg_buy_price numeric(10,2) not null,
  total_invested numeric(12,2) not null,
  updated_at timestamp with time zone default now()
);
```

## 2. Vistas Clave de la Aplicación

1. **Dashboard Familiar (Vista Compartida / Leaderboard):**
   - Resumen del patrimonio total del club.
   - Tabla de clasificación mensual y anual (por rentabilidad % ponderada).
   - Actividad reciente (ej. "Lucas invirtió 50€ en Cartera Tecnología").

2. **Panel de Gestión de Asignaciones (Vista Padre / Admin):**
   - Programación de paga / asignación mensual para cada hijo.
   - Creación y edición de carteras propuestas con ficha didáctica explicativa.
   - Aprobación o revisión de movimientos.

3. **Portal del Miembro / Hijo (Inversión & Aprendizaje):**
   - Saldo disponible para asignar este mes.
   - Explorador de carteras con gráficos de rendimiento simulado/histórico.
   - Desafíos didácticos o insignias financieras desbloqueables.
