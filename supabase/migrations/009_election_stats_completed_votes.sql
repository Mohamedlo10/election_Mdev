-- Migration 009: Mise à jour du calcul des votes pour ne compter que les votants ayant voté dans TOUTES les catégories

CREATE OR REPLACE FUNCTION get_election_stats(p_instance_id UUID)
RETURNS TABLE (
  total_voters BIGINT,
  registered_voters BIGINT,
  votes_cast BIGINT,
  categories_count BIGINT,
  candidates_count BIGINT
) AS $$
DECLARE
  v_cat_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_cat_count FROM categories WHERE instance_id = p_instance_id;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM voters WHERE instance_id = p_instance_id) as total_voters,
    (SELECT COUNT(*) FROM voters WHERE instance_id = p_instance_id AND is_registered = TRUE) as registered_voters,
    COALESCE(
      (
        SELECT COUNT(*)
        FROM (
          SELECT voter_id
          FROM votes
          WHERE instance_id = p_instance_id
          GROUP BY voter_id
          HAVING COUNT(DISTINCT category_id) = v_cat_count AND v_cat_count > 0
        ) sub
      ),
      0
    )::BIGINT as votes_cast,
    v_cat_count as categories_count,
    (SELECT COUNT(*) FROM candidates c
     JOIN categories cat ON cat.id = c.category_id
     WHERE cat.instance_id = p_instance_id) as candidates_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_election_stats(UUID) TO authenticated, anon, service_role;
