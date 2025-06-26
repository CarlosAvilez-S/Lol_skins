const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const version = '15.12.1'; // usa la última versión válida aquí
const sourceRoot = path.join("C:", "Users", "cavil", "Documents", "Lol", "lol-skins", "skins");
const outputRoot = path.join("C:", "Users", "cavil", "Documents", "Lol", "lol-skins-output");

function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/gi, '');
}

function normalizeNameApi(name) {
  let nameParsed = name.replace(/[^a-z0-9]/gi, '');

  if (["kaisa", "belveth", "chogath", "velkoz", "khazix", "leblanc"].includes(nameParsed.toLowerCase())) {
    nameParsed = nameParsed.charAt(0).toUpperCase() + nameParsed.slice(1).toLowerCase();
  }

  if (nameParsed.toLowerCase() == "nunuwillump") {
    return "Nunu"
  }

  if (nameParsed.toLowerCase() == "wukong") {
    return "MonkeyKing"
  }

  if (nameParsed.toLowerCase() == "renataglasc") {
    return "Renata"
  }

  return nameParsed
}

async function getChampionMap() {
  const url = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`;
  const response = await fetch(url);
  const data = await response.json();
  const champions = data.data;

  const map = {};
  for (const key in champions) {
    const champ = champions[key];
    const normalizedName = normalizeName(champ.name);
    map[normalizedName] = champ.key;
  }
  return map;
}

async function convertSkins() {
  const championNameToId = await getChampionMap();

  for (const championDir of fs.readdirSync(sourceRoot)) {
    const champPath = path.join(sourceRoot, championDir);
    if (!fs.statSync(champPath).isDirectory()) continue;

    const championNameFormatted = normalizeName(championDir);
    const champId = championNameToId[championNameFormatted];

    if (!champId) {
      console.warn(`⚠️ No se encontró ID para el campeón: ${championDir}`);
      continue;
    }

    const apiUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion/${normalizeNameApi(championDir)}.json`;
    const response = await fetch(apiUrl);
    if (!response.ok) {
      console.warn(`❌ No se pudo obtener la data de skins para ${normalizeNameApi(championDir)}`);
      continue;
    }

    const json = await response.json();
    const skinList = json.data[normalizeNameApi(championDir)].skins;

    const skinMap = {};
    for (const skin of skinList) {
      skinMap[normalizeName(skin.name)] = skin.num;
    }

    const champOutputDir = path.join(outputRoot, champId);
    fse.ensureDirSync(champOutputDir);

    const innerFiles = fs.readdirSync(champPath);
    for (const file of innerFiles) {
      const fullPath = path.join(champPath, file);
      if (fs.statSync(fullPath).isDirectory() || !file.endsWith('.zip')) continue;

      const skinName = path.basename(file, '.zip');
      const skinKey = normalizeName(skinName);
      const skinNum = skinMap[skinKey];

      if (skinNum === undefined) {
        console.warn(`----- No se encontró match para: "${skinName}"`);
        continue;
      }

      const destPath = path.join(champOutputDir, `${skinNum}.fantome`);
      fse.copyFileSync(fullPath, destPath);
      console.log(`✔️ ${championDir} - ${skinName} → ${skinNum}.fantome`);
    }
  }
}

convertSkins().catch(console.error);