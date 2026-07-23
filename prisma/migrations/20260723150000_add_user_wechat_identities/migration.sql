-- Database Logical Design v2.0
-- DCR-002: add the WeChat identity mapping to the existing users identity system.

CREATE TABLE user_wechat_identities (
  id uuid DEFAULT uuidv7() NOT NULL,
  user_id uuid NOT NULL,
  openid varchar(128) NOT NULL,
  unionid varchar(128),
  mini_program_appid varchar(100) NOT NULL,
  status varchar(50) NOT NULL,
  bound_at timestamptz NOT NULL,
  last_login_at timestamptz,
  unbound_at timestamptz,
  unbound_by uuid,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  CONSTRAINT pk_user_wechat_identities PRIMARY KEY (id),
  CONSTRAINT ck_user_wechat_identities_status CHECK (status IN ('active', 'unbound', 'disabled')),
  CONSTRAINT ck_user_wechat_identities_identity_not_blank CHECK (
    openid = btrim(openid)
    AND length(openid) > 0
    AND mini_program_appid = btrim(mini_program_appid)
    AND length(mini_program_appid) > 0
  ),
  CONSTRAINT ck_user_wechat_identities_unionid_not_blank CHECK (
    unionid IS NULL OR (unionid = btrim(unionid) AND length(unionid) > 0)
  ),
  CONSTRAINT ck_user_wechat_identities_updated_at_range CHECK (updated_at >= created_at),
  CONSTRAINT ck_user_wechat_identities_bound_at_range CHECK (bound_at >= created_at),
  CONSTRAINT ck_user_wechat_identities_last_login_at_range CHECK (
    last_login_at IS NULL OR last_login_at >= bound_at
  ),
  CONSTRAINT ck_user_wechat_identities_unbound_lifecycle CHECK (
    (
      status = 'unbound'
      AND unbound_at IS NOT NULL
      AND unbound_by IS NOT NULL
      AND unbound_at >= bound_at
    )
    OR
    (
      status <> 'unbound'
      AND unbound_at IS NULL
      AND unbound_by IS NULL
    )
  )
);

CREATE UNIQUE INDEX uq_user_wechat_identities_active_openid_appid
  ON user_wechat_identities (openid, mini_program_appid)
  WHERE status = 'active';

CREATE UNIQUE INDEX uq_user_wechat_identities_active_user_id
  ON user_wechat_identities (user_id)
  WHERE status = 'active';

CREATE UNIQUE INDEX uq_user_wechat_identities_active_unionid
  ON user_wechat_identities (unionid)
  WHERE status = 'active' AND unionid IS NOT NULL;

CREATE INDEX idx_user_wechat_identities_status_updated_at
  ON user_wechat_identities (status, updated_at);

ALTER TABLE user_wechat_identities
  ADD CONSTRAINT fk_user_wechat_identities_user_id
  FOREIGN KEY (user_id) REFERENCES users(id)
  ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE user_wechat_identities
  ADD CONSTRAINT fk_user_wechat_identities_unbound_by
  FOREIGN KEY (unbound_by) REFERENCES users(id)
  ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE user_wechat_identities
  ADD CONSTRAINT fk_user_wechat_identities_created_by
  FOREIGN KEY (created_by) REFERENCES users(id)
  ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE user_wechat_identities
  ADD CONSTRAINT fk_user_wechat_identities_updated_by
  FOREIGN KEY (updated_by) REFERENCES users(id)
  ON UPDATE RESTRICT ON DELETE RESTRICT;
