-- App hardening migration (manual)
-- Apply to PostgreSQL before deploying backend with new code.

CREATE TABLE IF NOT EXISTS user_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    session_id VARCHAR(128) NOT NULL,
    device_id VARCHAR(128) NOT NULL,
    platform VARCHAR(32) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    last_seen_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP NULL,
    CONSTRAINT uk_user_sessions_user_session UNIQUE (user_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_last_seen
    ON user_sessions (user_id, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS game_action_idempotency (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    game_id BIGINT NOT NULL,
    action_type VARCHAR(16) NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    response_payload TEXT NULL,
    expire_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uk_game_action_idempotency_unique
        UNIQUE (user_id, game_id, action_type, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_game_action_idempotency_expire_at
    ON game_action_idempotency (expire_at);

-- Supabase API security hardening
ALTER TABLE IF EXISTS public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.game_action_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.game_action_idempotency FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.user_sessions FROM PUBLIC;
REVOKE ALL ON TABLE public.user_sessions FROM anon;
REVOKE ALL ON TABLE public.user_sessions FROM authenticated;

REVOKE ALL ON TABLE public.game_action_idempotency FROM PUBLIC;
REVOKE ALL ON TABLE public.game_action_idempotency FROM anon;
REVOKE ALL ON TABLE public.game_action_idempotency FROM authenticated;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'user_sessions'
          AND policyname = 'deny_all_user_sessions_api'
    ) THEN
        CREATE POLICY deny_all_user_sessions_api
            ON public.user_sessions
            FOR ALL
            TO anon, authenticated
            USING (false)
            WITH CHECK (false);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'game_action_idempotency'
          AND policyname = 'deny_all_game_action_idempotency_api'
    ) THEN
        CREATE POLICY deny_all_game_action_idempotency_api
            ON public.game_action_idempotency
            FOR ALL
            TO anon, authenticated
            USING (false)
            WITH CHECK (false);
    END IF;
END $$;
