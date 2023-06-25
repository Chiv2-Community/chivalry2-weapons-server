import { Database } from 'sqlite3';
import { ALL_WEAPONS, bonusMult, MeleeAttack, SpecialAttack, Target, Weapon } from 'chivalry2-weapons';
import fs from 'fs';
import { __dirname } from './util.js';

export const initDb = async (db: Database): Promise<void> => {
  fs.readFile(__dirname + '/assets/sql/schema.sql', 'utf8', (err, sql) => {
    if (err) {
        console.error(err.message);
        throw err;
    }

    db.serialize(() => {
      db.exec(sql);
      insertWeapons(db, ALL_WEAPONS);
    });
  });
};


const insertWeapons = (db: Database, weapons: Weapon[]): void => {
  weapons.forEach(weapon => {
    db.run(
        `INSERT OR REPLACE INTO Weapons (id, name, damageType, weaponTypes, classes, subclasses, aliases) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [weapon.id, weapon.name, weapon.damageType, JSON.stringify(weapon.weaponTypes), JSON.stringify(weapon.classes), JSON.stringify(weapon.subclasses), JSON.stringify(weapon.aliases)]
    );

    const insertAttack = (attackType: string, attack: MeleeAttack | SpecialAttack, ranges?: {range: number, altRange: number}): void => {
        const baseDamage = attack.damage;
        const averageDamage = bonusMult(1, Target.AVERAGE, weapon.damageType, false) * baseDamage;
        const footmanDamage = bonusMult(1, Target.FOOTMAN, weapon.damageType, false) * baseDamage;
        const knightDamage = bonusMult(1, Target.KNIGHT, weapon.damageType, false) * baseDamage;

        db.run(
            `INSERT OR REPLACE INTO Attacks (weaponId, attackType, windup, baseDamage, averageDamage, footmanDamage, knightDamage, holding, release, recovery, combo, range, altRange) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [weapon.id, attackType, attack.windup, baseDamage, averageDamage, footmanDamage, knightDamage, attack.holding, attack.release, attack.recovery, attack.combo, ranges?.range, ranges?.altRange]
        )
    }

    insertAttack("LIGHT_AVERAGE", weapon.attacks.average.light, {range: weapon.attacks.average.range, altRange: weapon.attacks.average.altRange});
    insertAttack("HEAVY_AVERAGE", weapon.attacks.average.light, {range: weapon.attacks.average.range, altRange: weapon.attacks.average.altRange});
    insertAttack("LIGHT_SLASH", weapon.attacks.slash.light, {range: weapon.attacks.slash.range, altRange: weapon.attacks.slash.altRange});
    insertAttack("LIGHT_OVERHEAD", weapon.attacks.overhead.light, {range: weapon.attacks.overhead.range, altRange: weapon.attacks.overhead.altRange});
    insertAttack("LIGHT_STAB", weapon.attacks.stab.light, {range: weapon.attacks.stab.range, altRange: weapon.attacks.stab.altRange});
    insertAttack("HEAVY_SLASH", weapon.attacks.slash.heavy, {range: weapon.attacks.slash.range, altRange: weapon.attacks.slash.altRange});
    insertAttack("HEAVY_OVERHEAD", weapon.attacks.overhead.heavy, {range: weapon.attacks.overhead.range, altRange: weapon.attacks.overhead.altRange});
    insertAttack("HEAVY_STAB", weapon.attacks.stab.heavy, {range: weapon.attacks.stab.range, altRange: weapon.attacks.stab.altRange});
    insertAttack("THROW", weapon.attacks.throw);
    insertAttack("SPECIAL", weapon.attacks.special);
    insertAttack("LEAPING_STRIKE", weapon.attacks.sprintAttack);
    insertAttack("SPRINT_CHARGE", weapon.attacks.sprintCharge);
  });
};

export const jsonContainsAny = (columnName: string, values: string[]): string => {
  return " (" + values.map(value => `${columnName} LIKE '%"${value}"%'`).join(" OR ") + ")";
}