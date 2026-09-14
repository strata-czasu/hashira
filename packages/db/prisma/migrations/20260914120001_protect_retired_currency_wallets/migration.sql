CREATE OR REPLACE FUNCTION protect_retired_currency_wallets()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  protected_currency_id INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    protected_currency_id := NEW.currency;
  ELSE
    protected_currency_id := OLD.currency;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM currency
    WHERE id = protected_currency_id
      AND "retiredAt" IS NOT NULL
  ) THEN
    IF TG_OP = 'DELETE'
      OR TG_OP = 'INSERT'
      OR OLD.balance IS DISTINCT FROM NEW.balance
      OR OLD.currency IS DISTINCT FROM NEW.currency
      OR OLD."userId" IS DISTINCT FROM NEW."userId"
      OR OLD."guildId" IS DISTINCT FROM NEW."guildId"
    THEN
      RAISE EXCEPTION 'currency % is retired', protected_currency_id
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE'
    AND OLD.currency IS DISTINCT FROM NEW.currency
    AND EXISTS (
      SELECT 1
      FROM currency
      WHERE id = NEW.currency
        AND "retiredAt" IS NOT NULL
    )
  THEN
    RAISE EXCEPTION 'currency % is retired', NEW.currency
      USING ERRCODE = 'P0001';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER wallet_retired_currency_guard
BEFORE INSERT OR UPDATE OR DELETE ON wallet
FOR EACH ROW
EXECUTE FUNCTION protect_retired_currency_wallets();
