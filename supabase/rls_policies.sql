-- ============================================================
-- RLS POLICIES - VirtuAbogado
-- Defense-in-depth: Prisma (service_role) bypasses RLS,
-- estas políticas protegen contra accesos directos vía
-- Supabase API (PostgREST) con anon key.
-- ============================================================

-- 1. USERS
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data" ON "User"
    FOR SELECT
    USING (auth.uid()::text = id);

CREATE POLICY "Admins can read all users" ON "User"
    FOR SELECT
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY "Admins can update users" ON "User"
    FOR UPDATE
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'ADMIN');

-- 2. SERVICES
ALTER TABLE "Service" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active services" ON "Service"
    FOR SELECT
    USING (activo = true);

CREATE POLICY "Admins can manage services" ON "Service"
    FOR ALL
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'ADMIN');

-- 3. ORDERS
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can read own orders" ON "Order"
    FOR SELECT
    USING (auth.uid()::text = "userId");

CREATE POLICY "Lawyers can read assigned orders" ON "Order"
    FOR SELECT
    USING (auth.uid()::text = "lawyerId");

CREATE POLICY "Admins can read all orders" ON "Order"
    FOR SELECT
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY "Admins and system can update orders" ON "Order"
    FOR UPDATE
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'ADMIN');

-- 4. MESSAGES
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read messages" ON "Message"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "Order"
            WHERE "Order".id = "Message"."orderId"
            AND ("Order"."userId" = auth.uid()::text OR "Order"."lawyerId" = auth.uid()::text)
        )
    );

CREATE POLICY "Participants can insert messages" ON "Message"
    FOR INSERT
    WITH CHECK (
        auth.uid()::text = "senderId"
        AND EXISTS (
            SELECT 1 FROM "Order"
            WHERE "Order".id = "orderId"
            AND ("Order"."userId" = auth.uid()::text OR "Order"."lawyerId" = auth.uid()::text)
        )
    );

CREATE POLICY "Admins can manage messages" ON "Message"
    FOR ALL
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'ADMIN');

-- 5. DOCUMENTS
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read documents" ON "Document"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "Order"
            WHERE "Order".id = "Document"."orderId"
            AND ("Order"."userId" = auth.uid()::text OR "Order"."lawyerId" = auth.uid()::text)
        )
    );

CREATE POLICY "Admins can manage documents" ON "Document"
    FOR ALL
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'ADMIN');

-- 6. PAYMENT METHODS
ALTER TABLE "PaymentMethod" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active payment methods" ON "PaymentMethod"
    FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage payment methods" ON "PaymentMethod"
    FOR ALL
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'ADMIN');

-- 7. FINANCIAL SETTINGS (Admin only)
ALTER TABLE "FinancialSettings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can access financial settings" ON "FinancialSettings"
    FOR ALL
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'ADMIN');

-- 8. LAWYER PAYOUTS
ALTER TABLE "LawyerPayouts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lawyers can read own payouts" ON "LawyerPayouts"
    FOR SELECT
    USING (auth.uid()::text = "lawyerId");

CREATE POLICY "Admins can manage payouts" ON "LawyerPayouts"
    FOR ALL
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'ADMIN');

-- 9. PUSH SUBSCRIPTIONS
ALTER TABLE "PushSubscription" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscriptions" ON "PushSubscription"
    FOR SELECT
    USING (auth.uid()::text = "userId");

CREATE POLICY "Users can insert own subscriptions" ON "PushSubscription"
    FOR INSERT
    WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own subscriptions" ON "PushSubscription"
    FOR DELETE
    USING (auth.uid()::text = "userId");

-- 10. PASSWORD RESET TOKENS (System only, no direct access)
ALTER TABLE "PasswordResetToken" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only system can access reset tokens" ON "PasswordResetToken"
    FOR ALL
    USING (auth.role() = 'service_role');

-- 11. REVIEWS
ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read reviews" ON "Review"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "Order"
            WHERE "Order".id = "Review"."orderId"
            AND ("Order"."userId" = auth.uid()::text OR "Order"."lawyerId" = auth.uid()::text)
        )
    );

CREATE POLICY "Any authenticated user can create review" ON "Review"
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage reviews" ON "Review"
    FOR ALL
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'ADMIN');

-- 12. EVENT LOG (Admin only)
ALTER TABLE "EventLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can access event logs" ON "EventLog"
    FOR ALL
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'ADMIN');
