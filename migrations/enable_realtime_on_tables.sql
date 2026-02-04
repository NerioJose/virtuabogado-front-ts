-- Enable Realtime for all necessary tables
-- Run this in Supabase SQL Editor

-- Enable Realtime on User table (for clients and lawyers)
ALTER PUBLICATION supabase_realtime ADD TABLE "User";

-- Enable Realtime on Order table
ALTER PUBLICATION supabase_realtime ADD TABLE "Order";

-- Enable Realtime on Service table
ALTER PUBLICATION supabase_realtime ADD TABLE "Service";

-- Enable Realtime on Financial Settings table
ALTER PUBLICATION supabase_realtime ADD TABLE "FinancialSettings";

-- Enable Realtime on Message table (for chat)
ALTER PUBLICATION supabase_realtime ADD TABLE "Message";

-- Verify enabled tables
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Expected output should show:
-- User
-- Order
-- Service
-- FinancialSettings
-- Message
