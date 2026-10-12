# Claude Code - Contexto del Proyecto: Club de Inversión Familiar

Este repositorio contiene las especificaciones de marca, diseño, arquitectura de base de datos y especificaciones técnicas para desarrollar **Clubdeinversionfamiliar.com**.

## Misión de la Aplicación
Una plataforma web/PWA interactiva orientada a la educación financiera práctica en familia.
- **Asignaciones periódicas/mensuales**: Los administradores (padres/tutores) dotan un capital (ficticio o real tutorizado) a cada miembro.
- **Carteras de inversión**: Los miembros eligen cómo distribuir su saldo entre distintas carteras de valores/activos propuestas con perfiles de riesgo y tesis pedagógicas claras.
- **Gamificación y Competición familiar**: Leaderboard con métricas de rentabilidad ponderada, insignias por constancia y análisis conjunto familiar.

## Stack Tecnológico Recomendado
- **Frontend / Fullstack**: Next.js 15+ (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide React, Shadcn/ui.
- **Gráficos / Charts**: Recharts o Tremor.
- **Base de Datos & Auth**: Supabase (PostgreSQL, Row Level Security, Auth con roles `admin`/`parent` y `member`/`child`).
- **Estado & Formularios**: Zustand / React Hook Form + Zod.

## Estándares de Diseño y UI
- Respetar escrupulosamente los tokens de color y la identidad de marca descritos en `docs/brand-guidelines.md`.
- El isotipo y logotipo se encuentran en formato vectorial en `assets/logo.svg`.
- Accesibilidad WCAG AA, responsive mobile-first y modo oscuro nativo.
