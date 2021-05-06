const fetch = require("node-fetch")
const cachedMods = require("../data/cached-mods.json")
const { getCategories } = require("./get-categories.js")
const { addMod, getLastSoldMods, getModSalesInLastYear } = require("../integrations/dynamodb.js")
// eslint-disable-next-line max-len
const { getInventoryItemDefinitionEndpoint } = require ("./get-inventory-item-definition-endpoint.js")
const { getLastSoldMessge } = require("./get-last-sold-message.js")
const { getManifest } = require ("./get-manifest.js")
const { isNewInventory } = require ("./is-new-inventory.js")

module.exports.getBanshee44Inventory = async (auth) => {
  console.log("getBanshee44Inventory called")
  const { accessToken, apiKey } = auth
  const options = {
    "method": "get",
    "headers": {
      "Authorization": `Bearer ${accessToken}`,
      "X-API-Key": apiKey
    }
  }

  // eslint-disable-next-line max-len
  const bansheeItemDefinitionsEndpoint = "https://www.bungie.net/Platform/Destiny2/3/Profile/4611686018467431261/Character/2305843009299499863/Vendors/672118013/?components=300,301,302,304,305,400,401,402"
  let bansheeInventoryResponse = await fetch(bansheeItemDefinitionsEndpoint, options)

  let isValidAuth = bansheeInventoryResponse.status === 200
  const maxRetries = 5
  let authRetries = 0
  if (!isValidAuth) {
    while (authRetries < maxRetries && !isValidAuth) {
      authRetries += 1
      bansheeInventoryResponse = await fetch(bansheeItemDefinitionsEndpoint, options)
      isValidAuth = bansheeInventoryResponse.status === 200
    }

    if (authRetries === maxRetries && !isValidAuth) {
      throw new Error(`The Bungie auth failed to load ${maxRetries} times`)
    }
  }

  const bansheeInventory = await bansheeInventoryResponse.json()
  const categoryData = bansheeInventory.Response.categories.data.categories
  const salesData = bansheeInventory.Response.sales.data

  let manifest
  let manifestRetries
  let itemDefinitions
  let inventoryItemDefinitionEndpoint

  const getItemDefinitions = async () => {
    console.log("getItemDefinitions called")
    if (itemDefinitions === undefined) {
      try {
        const manifestResponse = await getManifest()
        manifest = manifestResponse.manifest
        manifestRetries = manifestResponse.manifestRetries
      } catch (error) {
        const result = { metadata: { error } }
        console.log(`Completing request:\n${JSON.stringify(result, null, "  ")}`)
        return JSON.stringify(result, null, "  ")
      }

      inventoryItemDefinitionEndpoint = getInventoryItemDefinitionEndpoint(manifest)
      const itemDefinitionsResponse = await fetch(inventoryItemDefinitionEndpoint)
      itemDefinitions = await itemDefinitionsResponse.json()
    }
    return itemDefinitions
  }

  const categories = getCategories(categoryData)
  const currentMods = []
  let usedCachedData = true
  for (const category of categories) {
    const itemHash = salesData[category].itemHash
    let mod = cachedMods[itemHash]

    if (mod === undefined) {
      usedCachedData = false
      mod = {}
      await getItemDefinitions()
      mod.type = itemDefinitions[itemHash].itemTypeAndTierDisplayName
      mod.name = itemDefinitions[itemHash].displayProperties.name
    }

    mod.itemHash = itemHash
    currentMods.push(mod)
  }

  const lastSoldMods = await getLastSoldMods()
  const newInventory = await isNewInventory(currentMods, lastSoldMods)

  let lastUpdated = undefined
  if (newInventory) {
    const timestamp = new Date().toISOString()
    for (const mod of currentMods) {
      await addMod(mod, timestamp)
    }
    lastUpdated = timestamp
  } else {
    lastUpdated = lastSoldMods[0].timestamp
  }

  const currentItems = []
  for (const mod of currentMods) {
    const modSales = await getModSalesInLastYear(mod)
    const lastSold = getLastSoldMessge(modSales)
    currentItems.push({
      name: mod.name,
      itemHash: mod.itemHash,
      type: mod.type,
      lastSold,
      timesSoldInLastYear: modSales.length
    })
  }

  return {
    inventory: currentItems,
    lastUpdated,
    authRetries,
    manifestRetries,
    usedCachedData,
    inventoryItemDefinitionEndpoint
  }
}
