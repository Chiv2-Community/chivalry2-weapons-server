import express from 'express';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import { initDb, jsonContainsAny } from './sqlite.js';
import { SpecialAttack, Swing } from 'chivalry2-weapons';
import { __dirname } from './util.js';
import cors from 'cors';

const { Database } = sqlite3;

const app = express();
app.use(bodyParser.json());
app.use(cors({
  origin: '*'
}));

const db = new Database('./.local.sqlite');  // replace with the path to your SQLite database file

const DEFAULT_SORT_ORDERS = {
  "name": "ASC",
  "damageType": "ASC",
  "attackType": "ASC",
  "windup": "ASC",
  "baseDamage": "DESC",
  "averageDamage": "DESC",
  "footmanDamage": "DESC",
  "knightDamage": "DESC",
  "holding": "ASC",
  "release": "DESC",
  "recovery": "ASC",
  "combo": "ASC",
  "range": "DESC",
  "altRange": "DESC"
} as Record<string, string>;

const VALID_SORT_COLUMNS = Object.keys(DEFAULT_SORT_ORDERS);

type PotentiallyPartialWeapon = Record<string, Record<string, Swing | SpecialAttack> | string | string[]>

function capsCaseToCamelCase(str: string): string {
  return str.toLowerCase().replace(/_([a-z])/g, function (g) { return g[1]!.toUpperCase(); });
}

const buildWeapons = (rows: any[]): PotentiallyPartialWeapon[] => {
  let results = {} as Record<string, any>;
  rows.forEach(rawRow => {
    let row = rawRow as {
      weaponId: string,
      name: string,
      range: number,
      altRange: number,
      damageType: string,
      weaponTypes: string,
      classes: string,
      subclasses: string,
      aliases: string,
      attackType: string,
      windup: number,
      baseDamage: number,
      averageDamage: number,
      footmanDamage: number,
      knightDamage: number,
      holding: number,
      release: number,
      recovery: number,
      combo: number,
    }

    if (!Object.hasOwn(results, row.weaponId)) {
      results[row.weaponId] = {
        "name": row.name,
        "damageType": row.damageType,
        "classes": JSON.parse(row.classes),
        "subclasses": JSON.parse(row.subclasses)
      } as Record<string, Record<string, Swing | SpecialAttack> | string | string[]>;
      results[row.weaponId]["attacks"] = {} as Record<string, Swing | SpecialAttack>;
    }

    if(row.attackType.includes("SLASH") || row.attackType.includes("OVERHEAD") || row.attackType.includes("STAB") || row.attackType.includes("AVERAGE")) {
      const attack = row.attackType.split("_")[1]!.toLowerCase();
      const lightOrHeavy = row.attackType.split("_")[0]!.toLowerCase();
      if (!Object.hasOwn(results[row.weaponId]["attacks"], attack)) {
        results[row.weaponId]["attacks"][attack] = {} as Record<string, Swing>;
      }

      results[row.weaponId]["attacks"][attack]["range"] = row.range;
      results[row.weaponId]["attacks"][attack]["altRange"] = row.altRange;

      results[row.weaponId]["attacks"][attack][lightOrHeavy] = {
          windup: row.windup,
          baseDamage: row.baseDamage,
          averageDamage: row.averageDamage,
          footmanDamage: row.footmanDamage,
          knightDamage: row.knightDamage,
          holding: row.holding,
          release: row.release,
          recovery: row.recovery,
          combo: row.combo,
      } as Record<string, number>;
    } else {
      results[row.weaponId]["attacks"][capsCaseToCamelCase(row.attackType)] = {
          windup: row.windup,
          baseDamage: row.baseDamage,
          averageDamage: row.averageDamage,
          footmanDamage: row.footmanDamage,
          knightDamage: row.knightDamage,
          holding: row.holding,
          release: row.release,
          recovery: row.recovery,
          combo: row.combo,
      } as Record<string, number>;
    }
  });

  return Object.values(results);
}

function buildBaseSelect(columnsString: string): string {
  return `SELECT ${columnsString} FROM Weapons JOIN Attacks ON Weapons.id = Attacks.weaponId WHERE 1=1`;
}

app.get('/.well-known/ai-plugin.json', (_, res) => {
  res.sendFile(__dirname + '/assets/ai-plugin.json');
})

app.get('/openapi.yaml', (_, res) => {
  res.sendFile(__dirname + '/assets/openapi.yaml');
})

app.get('/api/weapons', (req, res) => {
  const { classes, subclasses, names, damageTypes, attackTypes, sortColumn, sortOrder, offset, limit, partialWeapons } = req.query;

  let allowPartialWeapons = partialWeapons === undefined ? false : partialWeapons?.toString() === "true"

  let initialSelectColumns = allowPartialWeapons ? "*" : "Weapons.id"

  let sql = buildBaseSelect(initialSelectColumns);

  let orderByClause = "";
  if (sortColumn) {
    if (!VALID_SORT_COLUMNS.includes(sortColumn.toString())) {
      res.status(400).json({ error: `Invalid sort column: ${sortColumn}` });
    }

    orderByClause += ` ORDER BY ${sortColumn}`;
    if (sortOrder) orderByClause += ` ${sortOrder}`;
    else orderByClause += ` ${DEFAULT_SORT_ORDERS[sortColumn.toString()]}`;
  }


  if (classes) { sql += ` AND ` + jsonContainsAny("classes", classes.toString().split(",")); }
  if (subclasses) sql += ` AND ` + jsonContainsAny("subclasses", subclasses.toString().split(","));
  if (damageTypes) sql += ` AND damageType IN ("${damageTypes.toString().split(",").join('", "')}")`;
  if (names) sql += ` AND (name IN ("${names.toString().split(",").join('", "')}") OR ` + jsonContainsAny("aliases", names.toString().split(",")) + `)`;
  if (attackTypes) sql += ` AND attackType IN ("${attackTypes.toString().split(",").join('", "')}")`;

  sql += orderByClause;

  if (limit) {
    sql += ` LIMIT ${limit}`;
    if (offset) sql += ` OFFSET ${offset} `;
  }

  console.log(sql);

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (allowPartialWeapons) {  
      return res.json(buildWeapons(rows));
    } else {
      const typedRows = rows as {id: string}[];
      const ids = [...new Set(typedRows.map(row => row.id))];
      const query = buildBaseSelect("*") + ' AND Weapons.id IN ("' + ids.join('","') + '")' + orderByClause;

      console.log(query);
      return db.all(query, [], (err, rows) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        return res.json(buildWeapons(rows));
      });
    }
  });
});

// Start the server

await initDb(db);
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});