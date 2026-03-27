#!/bin/bash

# Script de Limpieza y Estabilización - virtuAbogado
# Ejecuta este script para resetear el entorno de desarrollo y regenerar Prisma

echo "🛡️ Iniciando Operación de Limpieza y Estabilización..."

# 1. Detener procesos de next si existen
pkill -f "next-dev" || true

# 2. Limpiar caché de Next.js y Webpack
echo "🧹 Limpiando caché (.next)..."
rm -rf .next

# 3. Regenerar Cliente de Prisma
echo "💎 Regenerando Cliente de Prisma..."
npx prisma generate

# 4. Limpiar caché de npm/pnpm (opcional pero recomendado en casos críticos)
# pnpm store prune

echo "✅ Limpieza completada. Ya puedes ejecutar 'pnpm run dev'."
