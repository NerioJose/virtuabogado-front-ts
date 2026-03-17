-- VirtuAbogado Security & Optimization Migration
-- This script enables RLS and sets granular policies for all core tables.
-- It is designed to be RE-RUNNABLE (Idempotent).

-- 1. Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Service" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinancialSettings" ENABLE ROW LEVEL SECURITY;

-- 2. USER Table Policies
DROP POLICY IF EXISTS "Public profiles are visible to everyone" ON "User";
CREATE POLICY "Public profiles are visible to everyone"
ON "User" FOR SELECT
USING (
  rol = 'ABOGADO' OR 
  auth.uid()::text = id OR 
  EXISTS (
    SELECT 1 FROM "User" WHERE id = auth.uid()::text AND (rol = 'ADMIN' OR rol = 'ABOGADO')
  ) OR
  EXISTS (
    SELECT 1 FROM "Order" 
    WHERE ("Order"."userId" = id AND "Order"."lawyerId" = auth.uid()::text)
    OR ("Order"."lawyerId" = id AND "Order"."userId" = auth.uid()::text)
  )
);

DROP POLICY IF EXISTS "Users can update their own profile" ON "User";
CREATE POLICY "Users can update their own profile"
ON "User" FOR UPDATE
TO authenticated
USING (auth.uid()::text = id)
WITH CHECK (auth.uid()::text = id);

-- 3. SERVICE Table Policies
DROP POLICY IF EXISTS "Services are visible to everyone" ON "Service";
CREATE POLICY "Services are visible to everyone"
ON "Service" FOR SELECT
USING (activo = true);

DROP POLICY IF EXISTS "Only admins can manage services" ON "Service";
CREATE POLICY "Only admins can manage services"
ON "Service" FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "User" WHERE id = auth.uid()::text AND rol = 'ADMIN'
  )
);

-- 4. ORDER Table Policies
DROP POLICY IF EXISTS "Users can see their own orders" ON "Order";
CREATE POLICY "Users can see their own orders"
ON "Order" FOR SELECT
TO authenticated
USING (
  auth.uid()::text = "userId" OR 
  auth.uid()::text = "lawyerId" OR
  EXISTS (
    SELECT 1 FROM "User" WHERE id = auth.uid()::text AND rol = 'ADMIN'
  )
);

DROP POLICY IF EXISTS "Users can create orders" ON "Order";
CREATE POLICY "Users can create orders"
ON "Order" FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Participants and admins can update orders" ON "Order";
CREATE POLICY "Participants and admins can update orders"
ON "Order" FOR UPDATE
TO authenticated
USING (
  auth.uid()::text = "userId" OR 
  auth.uid()::text = "lawyerId" OR
  EXISTS (
    SELECT 1 FROM "User" WHERE id = auth.uid()::text AND rol = 'ADMIN'
  )
);

-- 5. MESSAGE Table Policies
DROP POLICY IF EXISTS "Participants can see case messages" ON "Message";
CREATE POLICY "Participants can see case messages"
ON "Message" FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "Order"
    WHERE "Order".id = "Message"."orderId"
    AND (
      "Order"."userId" = auth.uid()::text OR 
      "Order"."lawyerId" = auth.uid()::text OR
      EXISTS (SELECT 1 FROM "User" WHERE id = auth.uid()::text AND rol = 'ADMIN')
    )
  )
);

DROP POLICY IF EXISTS "Participants can send messages" ON "Message";
CREATE POLICY "Participants can send messages"
ON "Message" FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid()::text = "senderId" AND
  EXISTS (
    SELECT 1 FROM "Order"
    WHERE "Order".id = "Message"."orderId"
    AND (
      "Order"."userId" = auth.uid()::text OR 
      "Order"."lawyerId" = auth.uid()::text OR
      EXISTS (SELECT 1 FROM "User" WHERE id = auth.uid()::text AND rol = 'ADMIN')
    )
  )
);

-- 6. DOCUMENT Table Policies
DROP POLICY IF EXISTS "Participants can see case documents" ON "Document";
CREATE POLICY "Participants can see case documents"
ON "Document" FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "Order"
    WHERE "Order".id = "Document"."orderId"
    AND (
      "Order"."userId" = auth.uid()::text OR 
      "Order"."lawyerId" = auth.uid()::text OR
      EXISTS (SELECT 1 FROM "User" WHERE id = auth.uid()::text AND rol = 'ADMIN')
    )
  )
);

DROP POLICY IF EXISTS "Participants can upload documents" ON "Document";
CREATE POLICY "Participants can upload documents"
ON "Document" FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid()::text = "uploaderId" AND
  EXISTS (
    SELECT 1 FROM "Order"
    WHERE "Order".id = "Document"."orderId"
    AND (
      "Order"."userId" = auth.uid()::text OR 
      "Order"."lawyerId" = auth.uid()::text OR
      EXISTS (SELECT 1 FROM "User" WHERE id = auth.uid()::text AND rol = 'ADMIN')
    )
  )
);

-- 7. Grant access for authenticated users
GRANT SELECT, INSERT, UPDATE ON "Order" TO authenticated;
GRANT SELECT, INSERT, UPDATE ON "Message" TO authenticated;
GRANT SELECT, INSERT, UPDATE ON "Document" TO authenticated;
GRANT SELECT, UPDATE ON "User" TO authenticated;
GRANT SELECT ON "Service" TO authenticated;
GRANT SELECT ON "Service" TO anon;
GRANT SELECT, INSERT, UPDATE ON "FinancialSettings" TO authenticated;

-- 8. FinancialSettings Table Policies
DROP POLICY IF EXISTS "Admins can read financial settings" ON "FinancialSettings";
CREATE POLICY "Admins can read financial settings"
ON "FinancialSettings" FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "User" WHERE id = auth.uid()::text AND rol = 'ADMIN'
  )
);

DROP POLICY IF EXISTS "Admins can update financial settings" ON "FinancialSettings";
CREATE POLICY "Admins can update financial settings"
ON "FinancialSettings" FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "User" WHERE id = auth.uid()::text AND rol = 'ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "User" WHERE id = auth.uid()::text AND rol = 'ADMIN'
  )
);
