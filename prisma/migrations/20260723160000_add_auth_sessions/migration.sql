-- Database Change Request 002 Completion Fix: authenticated session persistence.
-- Refresh credentials are persisted only as server-keyed one-way digests.
-- Rotation inserts the successor first, then atomically claims the predecessor;
-- a failed claim must roll back the transaction and its successor insert.

CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "client_type" VARCHAR(50) NOT NULL,
    "token_family_id" UUID NOT NULL,
    "refresh_token_hash" VARCHAR(128) NOT NULL,
    "refresh_token_expires_at" TIMESTAMPTZ(6) NOT NULL,
    "access_token_expires_at" TIMESTAMPTZ(6) NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL,
    "last_refreshed_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "revoked_by" UUID,
    "revocation_actor_type" VARCHAR(50),
    "revocation_reason" VARCHAR(1000),
    "replaced_by_session_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,

    CONSTRAINT "pk_auth_sessions" PRIMARY KEY ("id"),
    CONSTRAINT "uq_auth_sessions_refresh_token_hash" UNIQUE ("refresh_token_hash"),
    CONSTRAINT "uq_auth_sessions_replaced_by_session_id" UNIQUE ("replaced_by_session_id"),
    CONSTRAINT "ck_auth_sessions_client_type" CHECK ("client_type" IN ('pc', 'wechat-mini-program')),
    CONSTRAINT "ck_auth_sessions_refresh_token_hash" CHECK ("refresh_token_hash" = btrim("refresh_token_hash") AND length("refresh_token_hash") > 0),
    CONSTRAINT "ck_auth_sessions_refresh_expiry_after_access" CHECK ("refresh_token_expires_at" >= "access_token_expires_at"),
    CONSTRAINT "ck_auth_sessions_issued_before_access_expiry" CHECK ("issued_at" <= "access_token_expires_at"),
    CONSTRAINT "ck_auth_sessions_issued_before_refresh_expiry" CHECK ("issued_at" <= "refresh_token_expires_at"),
    CONSTRAINT "ck_auth_sessions_last_refreshed_after_issued" CHECK ("last_refreshed_at" IS NULL OR "last_refreshed_at" >= "issued_at"),
    CONSTRAINT "ck_auth_sessions_revocation_actor_type" CHECK ("revocation_actor_type" IS NULL OR "revocation_actor_type" IN ('user', 'system')),
    CONSTRAINT "ck_auth_sessions_revocation_group" CHECK (
        ("revoked_at" IS NULL AND "revocation_actor_type" IS NULL AND "revocation_reason" IS NULL)
        OR (
            "revoked_at" IS NOT NULL
            AND "revocation_actor_type" IS NOT NULL
            AND "revocation_reason" IS NOT NULL
            AND "revocation_reason" = btrim("revocation_reason")
            AND length("revocation_reason") > 0
        )
    ),
    CONSTRAINT "ck_auth_sessions_revocation_actor" CHECK (
        ("revocation_actor_type" IS NULL AND "revoked_by" IS NULL)
        OR ("revocation_actor_type" = 'user' AND "revoked_by" IS NOT NULL)
        OR ("revocation_actor_type" = 'system' AND "revoked_by" IS NULL)
    ),
    CONSTRAINT "ck_auth_sessions_revoked_after_issued" CHECK ("revoked_at" IS NULL OR "revoked_at" >= "issued_at"),
    CONSTRAINT "ck_auth_sessions_not_self_replaced" CHECK ("replaced_by_session_id" IS NULL OR "replaced_by_session_id" <> "id"),
    CONSTRAINT "ck_auth_sessions_replacement_refresh_time" CHECK ("replaced_by_session_id" IS NULL OR "last_refreshed_at" IS NOT NULL),
    CONSTRAINT "ck_auth_sessions_issued_after_created" CHECK ("issued_at" >= "created_at"),
    CONSTRAINT "ck_auth_sessions_updated_after_created" CHECK ("updated_at" >= "created_at")
);

CREATE INDEX "idx_auth_sessions_user_revoked_refresh_expiry"
    ON "auth_sessions" ("user_id", "revoked_at", "refresh_token_expires_at");

CREATE INDEX "idx_auth_sessions_family_revoked"
    ON "auth_sessions" ("token_family_id", "revoked_at");

CREATE INDEX "idx_auth_sessions_client_type_updated_at"
    ON "auth_sessions" ("client_type", "updated_at");

ALTER TABLE "auth_sessions"
    ADD CONSTRAINT "fk_auth_sessions_user_id"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "auth_sessions"
    ADD CONSTRAINT "fk_auth_sessions_revoked_by"
    FOREIGN KEY ("revoked_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "auth_sessions"
    ADD CONSTRAINT "fk_auth_sessions_created_by"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "auth_sessions"
    ADD CONSTRAINT "fk_auth_sessions_updated_by"
    FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "auth_sessions"
    ADD CONSTRAINT "fk_auth_sessions_replaced_by_session_id"
    FOREIGN KEY ("replaced_by_session_id") REFERENCES "auth_sessions"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE FUNCTION "check_auth_session_rotation_cycle"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."replaced_by_session_id" IS NULL THEN
        RETURN NEW;
    END IF;

    IF EXISTS (
        WITH RECURSIVE "rotation_chain" AS (
            SELECT "id", "replaced_by_session_id"
            FROM "auth_sessions"
            WHERE "id" = NEW."replaced_by_session_id"

            UNION ALL

            SELECT "session"."id", "session"."replaced_by_session_id"
            FROM "auth_sessions" AS "session"
            INNER JOIN "rotation_chain"
                ON "session"."id" = "rotation_chain"."replaced_by_session_id"
        )
        SELECT 1
        FROM "rotation_chain"
        WHERE "id" = NEW."id"
    ) THEN
        RAISE EXCEPTION 'auth session rotation cycle is not allowed'
            USING ERRCODE = '23514',
                  CONSTRAINT = 'ck_auth_sessions_rotation_acyclic';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER "trg_auth_sessions_rotation_acyclic"
BEFORE INSERT OR UPDATE OF "replaced_by_session_id" ON "auth_sessions"
FOR EACH ROW
EXECUTE FUNCTION "check_auth_session_rotation_cycle"();
