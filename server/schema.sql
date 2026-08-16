-- Statistiques « qui tape quoi » de tamdoku.
--
-- Reprend à l'identique les trois tables Convex, moins le snapshot : celui-ci
-- n'était qu'un cache reconstruit chaque nuit, et une requête agrégée le
-- remplace sans risque de péremption (cf. src/db.js).

CREATE TABLE IF NOT EXISTS counts (
  date    date    NOT NULL,
  cell    smallint NOT NULL CHECK (cell BETWEEN 0 AND 8),
  station text    NOT NULL,
  n       integer NOT NULL DEFAULT 0,
  PRIMARY KEY (date, cell, station)
);

CREATE INDEX IF NOT EXISTS counts_by_date ON counts (date);

-- Une ligne par (jour, joueur anonyme) : garantit une soumission comptée par jour.
CREATE TABLE IF NOT EXISTS submissions (
  date date NOT NULL,
  anon text NOT NULL,
  PRIMARY KEY (date, anon)
);
