BEGIN TRANSACTION; 
  CREATE TABLE IF NOT EXISTS Weapons(
    id TEXT PRIMARY KEY,
    name TEXT,
    damageType TEXT,
    classes TEXT,
    subclasses TEXT,
    weaponTypes TEXT,
    aliases TEXT
  );

  CREATE TABLE IF NOT EXISTS Attacks(
    weaponId TEXT,
    attackType TEXT,
    range DOUBLE,
    altRange DOUBLE,
    windup DOUBLE NOT NULL,
    baseDamage DOUBLE NOT NULL,
    averageDamage DOUBLE NOT NULL,
    knightDamage DOUBLE NOT NULL,
    footmanDamage DOUBLE NOT NULL,
    holding DOUBLE NOT NULL,
    release DOUBLE NOT NULL,
    recovery DOUBLE NOT NULL,
    combo DOUBLE NOT NULL,
    riposte DOUBLE,
    turnLimitStrength DOUBLE,
    verticalTurnLimitStrength DOUBLE,
    reverseTurnLimitStrength DOUBLE,
    feint DOUBLE,
    thwack DOUBLE,
    hitSuccess DOUBLE,
    blocked DOUBLE,
    worldHit DOUBLE,
    staminaCost DOUBLE,
    playRate DOUBLE,
    drawStrength DOUBLE,
    worldHitStartPercentage DOUBLE,
    worldHitStopPercentage DOUBLE,
    thwackOnHit DOUBLE,
    hitSuccessOnHit DOUBLE,
    direction TEXT,
    altDirection TEXT,
    cooldown DOUBLE,
    weaponTipCheckReverse DOUBLE,
    weaponTipCheckReverseAlt DOUBLE,
    weaponTipCheckDisable DOUBLE,
    comboFromBlocked DOUBLE,
    PRIMARY KEY(weaponId, attackType),
    FOREIGN KEY(weaponId) REFERENCES Weapons(id)
  );

COMMIT TRANSACTION;