const fetch = require("node-fetch")
const cachedMods = require("../data/cached-mods.json")
// eslint-disable-next-line max-len
const { getInventoryItemDefinitionEndpoint } = require ("./get-inventory-item-definition-endpoint.js")
const { getManifest } = require ("./get-manifest.js")
const { isBungieApiDownForMaintenance } = require("./is-bungie-api-down-for-maintenance.js")

module.exports.getBanshee44Inventory = async (auth) => {
  console.log("getBanshee44Inventory called")
  let manifest
  let itemDefinitions
  let usedCachedData = true
  const getCurrentBanshee44Mods = async () => {
    console.log("getCurrentBanshee44Mods called")
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
    const isBungieApiDownForMaintenanceFlag = await isBungieApiDownForMaintenance(auth)
    if (isBungieApiDownForMaintenanceFlag) {
      // eslint-disable-next-line max-len
      throw new Error("The Bungie API is down for maintenance. Check https://twitter.com/BungieHelp for more info.")
    }
    const bansheeInventoryResponse = await fetch(bansheeItemDefinitionsEndpoint, options)
    const bansheeInventory = await bansheeInventoryResponse.json()
    const categoryData = bansheeInventory.Response.categories.data.categories
    const salesData = bansheeInventory.Response.sales.data
    const getItemDefinitions = async () => {
      console.log("getItemDefinitions called")
      if (itemDefinitions === undefined) {
        try {
          const manifestResponse = await getManifest()
          manifest = manifestResponse.manifest
        } catch (error) {
          const result = { metadata: { error } }
          console.log(`Completing request:\n${JSON.stringify(result, null, "  ")}`)
          return JSON.stringify(result, null, "  ")
        }

        const inventoryItemDefinitionEndpoint = getInventoryItemDefinitionEndpoint(manifest)
        const itemDefinitionsResponse = await fetch(inventoryItemDefinitionEndpoint)
        itemDefinitions = await itemDefinitionsResponse.json()
      }
      return itemDefinitions
    }

    // Get categories for weapon mods for sale
    const [firstModCategory, secondModCategory] = categoryData[2].itemIndexes
    const categories = [firstModCategory, secondModCategory]

    const currentMods = []
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
    return currentMods
  }

  const currentMods = await getCurrentBanshee44Mods()
  const inventory = []
  for (const mod of currentMods) {
    inventory.push({
      name: mod.name,
      itemHash: mod.itemHash,
      type: mod.type
    })
  }

  return {
    inventory,
    usedCachedData
  }
}
