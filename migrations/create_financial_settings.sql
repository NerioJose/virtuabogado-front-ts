-- Migración: Crear tabla de configuración financiera
-- Ejecutar en Supabase SQL Editor

-- IMPORTANTE: Refrescar el schema cache de Supabase primero
NOTIFY pgrst, 'reload schema';

CREATE TABLE IF NOT EXISTS "FinancialSettings" (
  id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  
  -- Porcentajes financieros (0-100)
  lawyer_commission_percentage DECIMAL(5,2) NOT NULL DEFAULT 70.00 CHECK (lawyer_commission_percentage >= 0 AND lawyer_commission_percentage <= 100),
  operational_costs_percentage DECIMAL(5,2) NOT NULL DEFAULT 10.00 CHECK (operational_costs_percentage >= 0 AND operational_costs_percentage <= 100),
  
  -- Configuraciones adicionales para el futuro
  tax_percentage DECIMAL(5,2) DEFAULT 19.00 CHECK (tax_percentage >= 0 AND tax_percentage <= 100),
  platform_fee_percentage DECIMAL(5,2) DEFAULT 5.00 CHECK (platform_fee_percentage >= 0 AND platform_fee_percentage <= 100),
  
  -- Metadatos
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES "User"(id) ON DELETE SET NULL,
  
  -- Constraint para asegurar solo un registro (singleton pattern)
  CONSTRAINT single_financial_settings CHECK (id = '00000000-0000-0000-0000-000000000001'::uuid)
);

-- Comentarios para documentación
COMMENT ON TABLE "FinancialSettings" IS 'Configuración financiera global del sistema (singleton)';
COMMENT ON COLUMN "FinancialSettings".lawyer_commission_percentage IS 'Porcentaje de comisión que reciben los abogados por cada orden';
COMMENT ON COLUMN "FinancialSettings".operational_costs_percentage IS 'Porcentaje de gastos operativos sobre los ingresos totales';

-- Insertar valores por defecto (solo si no existen)
INSERT INTO "FinancialSettings" (
  id, 
  lawyer_commission_percentage, 
  operational_costs_percentage,
  tax_percentage,
  platform_fee_percentage
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  70.00,  -- 70% para abogados
  10.00,  -- 10% gastos operativos
  19.00,  -- 19% IVA (Colombia)
  5.00    -- 5% fee plataforma (futuro)
)
ON CONFLICT (id) DO NOTHING;

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_financial_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_financial_settings_timestamp
  BEFORE UPDATE ON "FinancialSettings"
  FOR EACH ROW
  EXECUTE FUNCTION update_financial_settings_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE "FinancialSettings" ENABLE ROW LEVEL SECURITY;

-- Policy: Solo admins pueden leer
CREATE POLICY "Admins can view financial settings"
  ON "FinancialSettings"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE "User".id = auth.uid()
      AND "User".rol = 'ADMIN'
    )
  );

-- Policy: Solo admins pueden actualizar
CREATE POLICY "Admins can update financial settings"
  ON "FinancialSettings"
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE "User".id = auth.uid()
      AND "User".rol = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE "User".id = auth.uid()
      AND "User".rol = 'ADMIN'
    )
  );

-- Grant necesarios
GRANT SELECT, UPDATE ON "FinancialSettings" TO authenticated;

-- Verificar que se creó correctamente
SELECT * FROM "FinancialSettings";
