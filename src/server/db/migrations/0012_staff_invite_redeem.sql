-- A person opening an emailed invite link has only the token, before any clinic
-- is known, so the tenant policy can't see the row. This extra policy lets
-- exactly the invite whose token hash was set by `withInviteToken` through
-- (nullif: an unset custom setting reads '' after its transaction ends).
CREATE POLICY "invite_by_token" ON "staff_invites"
  USING ("token_hash" = nullif(current_setting('app.current_invite_hash', true), ''))
  WITH CHECK ("token_hash" = nullif(current_setting('app.current_invite_hash', true), ''));
